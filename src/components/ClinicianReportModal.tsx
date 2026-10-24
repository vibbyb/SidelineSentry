import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AthleteProfile, AssessmentRecord, ClinicianCredential } from '../types/clinical';
import { Printer, Copy, Check, X, Shield, Download, Lock, CheckCircle2, Share2 } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { generateSessionHash } from '../services/security/sessionHash';
import { copyToClipboard } from '../utils/clipboard';
import { TRANSLATIONS, SupportedLocale } from '../i18n/translations';
import { translateTrigger } from '../i18n/triggerTranslator';
import { buildParentShareSummary, shareParentSummary } from '../utils/share';
import { SHARE_THEME_TEXT } from '../i18n/shareTheme';
import {
  EvaluatorReportInfo,
  CREDENTIAL_OPTIONS,
  formatPlainTextReport,
  exportReportJsonFile,
  getSportBiomechanicsNote
} from '../utils/reportFormatter';

interface ClinicianReportModalProps {
  athlete: AthleteProfile;
  assessment: AssessmentRecord;
  onClose: () => void;
  lang?: SupportedLocale;
  onUpdateAssessment?: (updated: AssessmentRecord) => void;
}

export const ClinicianReportModal: React.FC<ClinicianReportModalProps> = ({
  athlete,
  assessment,
  onClose,
  lang = 'en',
  onUpdateAssessment
}) => {
  const t = TRANSLATIONS[lang];
  const shareText = SHARE_THEME_TEXT[lang];
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [manualShareSummary, setManualShareSummary] = useState<string | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const copiedHashTimeoutRef = useRef<number | null>(null);

  const handleShareWithParent = async () => {
    const summaryText = buildParentShareSummary({ ...assessment, athlete }, lang);
    const shareTitle = `${athlete.name} - ${shareText.shareTitle}`;
    const outcome = await shareParentSummary(summaryText, shareTitle);
    if (outcome === 'shared' || outcome === 'copied') {
      setShareToast(shareText.shareSuccessToast);
      setTimeout(() => setShareToast(null), 3500);
    } else if (outcome === 'manual') {
      setManualShareSummary(summaryText);
    }
  };

  const [notes, setNotes] = useState<string>(() => getSportBiomechanicsNote(athlete.sport, lang));
  const [evaluatorName, setEvaluatorName] = useState<string>(assessment.certification?.evaluatorName || '');
  const [evaluatorRole, setEvaluatorRole] = useState<ClinicianCredential>(assessment.certification?.credential || 'ATC');
  const [licenseNumber, setLicenseNumber] = useState<string>(assessment.certification?.licenseNumber || '');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(assessment.certification?.signatureDataUrl || null);
  const [sessionHash, setSessionHash] = useState<string>(assessment.sessionHash || t.computingDigest);

  const hasIndividualBaseline = athlete.hasRecordedBaseline !== false;
  const mult = hasIndividualBaseline ? 1.0 : 0.85;

  const evaluatorInfo: EvaluatorReportInfo = { evaluatorName, evaluatorRole, licenseNumber, signatureUrl };

  // Compute report check code
  useEffect(() => {
    let isCurrent = true;
    const payload = JSON.stringify({
      id: assessment.id,
      athleteId: athlete.id,
      timestamp: assessment.timestamp,
      triage: assessment.triage.verdict,
      triggers: assessment.triage.primaryTriggers,
      stabilityIndex: assessment.balanceScore.stabilityIndex,
      reactionAvg: assessment.reactionScore.averageMs,
      kdSeconds: assessment.kingDevickScore.durationSeconds,
      redFlags: assessment.redFlags,
      evaluatorName,
      evaluatorRole,
      licenseNumber,
      hasSignature: Boolean(signatureUrl),
      notes
    });

    generateSessionHash(payload).then(hash => {
      if (isCurrent) setSessionHash(hash);
    });

    return () => { isCurrent = false; };
  }, [assessment, athlete.id, evaluatorName, evaluatorRole, licenseNumber, signatureUrl, notes]);

  const handleClose = useCallback(() => {
    if (onUpdateAssessment) {
      const hasCertification = evaluatorName.trim().length > 0 || !!signatureUrl;
      onUpdateAssessment({
        ...assessment,
        sessionHash,
        certification: hasCertification ? {
          evaluatorName,
          credential: evaluatorRole,
          licenseNumber,
          signedAt: assessment.certification?.signedAt || new Date().toISOString(),
          signatureDataUrl: signatureUrl || undefined,
          sessionHash
        } : undefined
      });
    }
    onClose();
  }, [assessment, evaluatorName, evaluatorRole, licenseNumber, onClose, onUpdateAssessment, sessionHash, signatureUrl]);

  // Escape key listener & timeout cleanup on unmount
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      if (copiedHashTimeoutRef.current !== null) window.clearTimeout(copiedHashTimeoutRef.current);
    };
  }, [handleClose]);

  const handleCopySummary = async () => {
    const summaryText = formatPlainTextReport(athlete, assessment, sessionHash, evaluatorInfo, notes, lang);
    const success = await copyToClipboard(summaryText);
    if (success) {
      setCopied(true);
      if (copiedTimeoutRef.current !== null) window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyHash = async () => {
    const success = await copyToClipboard(sessionHash);
    if (success) {
      setCopiedHash(true);
      if (copiedHashTimeoutRef.current !== null) window.clearTimeout(copiedHashTimeoutRef.current);
      copiedHashTimeoutRef.current = window.setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const scoreRows = [
    {
      name: t.test2Balance,
      baseline: `${(athlete.baselineStabilityIndex || 0.085).toFixed(3)} m/s²`,
      sideline: assessment.balanceScore.skippedReason ? t.skippedWarningSigns : `${assessment.balanceScore.stabilityIndex.toFixed(3)} m/s²`,
      isSkipped: Boolean(assessment.balanceScore.skippedReason),
      change: `${assessment.triage.swayDegradationPercent > 0 ? '+' : ''}${assessment.triage.swayDegradationPercent.toFixed(1)}%`,
      isFlagged: assessment.triage.swayDegradationPercent >= 25 * mult
    },
    {
      name: t.test3Reaction,
      baseline: `${athlete.baselineReactionTimeMs || 230} ms`,
      sideline: assessment.reactionScore.skippedReason ? t.skippedWarningSigns : `${assessment.reactionScore.averageMs} ms`,
      isSkipped: Boolean(assessment.reactionScore.skippedReason),
      change: `${assessment.triage.reactionDelayDeltaMs > 0 ? '+' : ''}${assessment.triage.reactionDelayDeltaMs} ms`,
      isFlagged: assessment.triage.reactionDelayDeltaMs >= 40 * mult
    },
    {
      name: t.test4EyeReading,
      baseline: `${(athlete.baselineKingDevickSeconds || 42.0).toFixed(1)} s`,
      sideline: assessment.kingDevickScore.skippedReason ? t.skippedWarningSigns : `${assessment.kingDevickScore.durationSeconds.toFixed(1)} s`,
      isSkipped: Boolean(assessment.kingDevickScore.skippedReason),
      change: `${assessment.triage.kingDevickDeltaSeconds > 0 ? '+' : ''}${assessment.triage.kingDevickDeltaSeconds.toFixed(1)}s (${assessment.kingDevickScore.errorsCount} ${t.errorsUnit})`,
      isFlagged: assessment.triage.kingDevickDeltaSeconds >= 5 * mult
    }
  ];

  const demographics = [
    { label: t.athleteNameLabel, value: athlete.name, mono: false },
    { label: t.jerseyIdLabel, value: `#${athlete.jerseyNumber}`, mono: true },
    { label: t.sportPositionLabel, value: `${athlete.sport} • ${athlete.position}`, mono: false },
    { label: t.baselineDateLabel, value: athlete.baselineDate || t.preseasonCertified, mono: true }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinician-report-modal-title"
      className="modal-print-container fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-transparent print:static print:overflow-visible"
    >
      <div className="bg-white border border-slate-300 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden my-8 text-slate-900 relative print:bg-white print:text-black print:border-none print:shadow-none print:w-full print:my-0 print:rounded-none">
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white print:hidden">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm tracking-wide text-white uppercase">{t.packetTitle}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShareWithParent}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs text-white border border-emerald-600 font-bold transition min-h-[44px]"
              title={shareText.shareWithParentBtn}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{shareText.shareWithParentBtn}</span>
            </button>
            <button
              onClick={() => exportReportJsonFile(athlete, assessment, sessionHash, evaluatorInfo, notes)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-blue-300 border border-slate-700 font-bold transition min-h-[44px]"
              title={t.exportJsonTooltip}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportJson}</span>
            </button>
            <button
              onClick={handleCopySummary}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 font-bold transition min-h-[44px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copied : t.copyText}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition uppercase min-h-[44px]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printPdf}</span>
            </button>
            <button
              onClick={handleClose}
              aria-label={t.closeModal}
              className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {shareToast && (
          <div
            role="status"
            aria-live="polite"
            className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center space-x-2 shrink-0 print:hidden shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{shareToast}</span>
          </div>
        )}

        {/* Printable Report Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto bg-white text-slate-900 print:max-h-none print:overflow-visible print:p-0">
          {/* Institution / Platform Banner */}
          <div className="flex justify-between items-start border-b pb-4 border-slate-300 print:border-black">
            <div>
              <div id="clinician-report-modal-title" className="text-xl font-black tracking-tight text-slate-900 print:text-black flex items-center space-x-2">
                <span>{t.reportDocTitle}</span>
              </div>
              <div className="text-xs text-slate-600 print:text-gray-600 mt-1 font-medium">{t.reportDocSubtitle}</div>
            </div>
            <div className="text-right font-mono text-xs text-slate-500 print:text-gray-600">
              <div>{t.sessionIdLabel}: {assessment.id.slice(0, 12)}</div>
              <div>{t.evaluatedLabel}: {assessment.timestamp}</div>
            </div>
          </div>

          {/* Athlete Demographics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 print:bg-gray-100 print:border-gray-300 text-xs shadow-sm">
            {demographics.map((item, idx) => (
              <div key={idx}>
                <div className="text-slate-600 uppercase text-[10px] font-bold">{item.label}</div>
                <div className={`font-bold text-slate-900 print:text-black text-sm mt-0.5 ${item.mono ? 'font-mono' : ''}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Sideline Check Result Banner */}
          <div
            className={`p-4 rounded-xl border-2 font-mono shadow-sm ${
              assessment.triage.verdict === 'IMMEDIATE_REMOVAL'
                ? 'bg-red-50 border-red-600 text-red-950 print:bg-red-100 print:text-red-900'
                : assessment.triage.verdict === 'INVALID_ASSESSMENT_RETEST_REQUIRED' ||
                  assessment.triage.verdict === 'EVALUATION_RECOMMENDED'
                ? 'bg-amber-50 border-amber-500 text-amber-950 print:bg-amber-100 print:text-amber-900'
                : 'bg-emerald-50 border-emerald-600 text-emerald-950 print:bg-emerald-100 print:text-emerald-900'
            }`}
          >
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 print:text-gray-700">
              {t.sidelineRecommendationTitle}
            </div>
            <div className="text-base font-black mt-1">
              {assessment.triage.verdict === 'IMMEDIATE_REMOVAL' && t.recImmediateRemoval}
              {assessment.triage.verdict === 'INVALID_ASSESSMENT_RETEST_REQUIRED' && t.recInvalidRetest}
              {assessment.triage.verdict === 'EVALUATION_RECOMMENDED' && t.recEvaluationRecommended}
              {assessment.triage.verdict === 'CLEAR_OBSERVED' && t.recClearObserved}
            </div>
            {assessment.triage.primaryTriggers.length > 0 && (
              <div className="mt-2 text-xs font-bold space-y-0.5">
                <div>{t.observedTriggersHeader}</div>
                {assessment.triage.primaryTriggers.map((tItem, idx) => (
                  <div key={idx} className="pl-2 text-red-700 print:text-red-700">• {translateTrigger(tItem, lang)}</div>
                ))}
              </div>
            )}
          </div>

          {/* Metric Comparison Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              {t.scoresSectionTitle}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-slate-300 print:border-gray-300 shadow-sm">
                <thead>
                  <tr className="bg-slate-100 print:bg-gray-200 text-slate-800 print:text-black">
                    <th className="p-2.5 border border-slate-300 print:border-gray-300 font-bold">{t.thTestName}</th>
                    <th className="p-2.5 border border-slate-300 print:border-gray-300 font-bold">{t.thBaseline}</th>
                    <th className="p-2.5 border border-slate-300 print:border-gray-300 font-bold">{t.thSideline}</th>
                    <th className="p-2.5 border border-slate-300 print:border-gray-300 font-bold">{t.thScoreChange}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-gray-300 font-mono">
                  {scoreRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 border border-slate-200 print:border-gray-300 font-sans font-bold text-slate-900">{row.name}</td>
                      <td className="p-2.5 border border-slate-200 print:border-gray-300 text-slate-600 print:text-gray-800">{row.baseline}</td>
                      <td className="p-2.5 border border-slate-200 print:border-gray-300 font-bold text-slate-900 print:text-black">
                        {row.isSkipped ? <span className="text-amber-800 font-bold text-[11px]">{row.sideline}</span> : row.sideline}
                      </td>
                      <td className={`p-2.5 border border-slate-200 print:border-gray-300 font-bold ${row.isFlagged ? 'text-red-700 print:text-red-700' : 'text-emerald-700'}`}>
                        {row.isSkipped ? 'N/A' : row.change}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluator Sign-Off Block */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 print:bg-white print:border-gray-300 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 print:border-gray-300">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 print:text-black flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-700" />
                <span>{t.certBlockTitle}</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">{t.schoolSidelineBadge}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-700 font-bold block mb-1">{t.evaluatorName}</label>
                <input
                  type="text"
                  value={evaluatorName}
                  onChange={e => setEvaluatorName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-xs print:bg-white print:text-black print:border-gray-300 shadow-sm"
                  placeholder={t.evaluatorPlaceholder}
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-700 font-bold block mb-1">{t.evaluatorRole}</label>
                <select
                  value={evaluatorRole}
                  onChange={e => setEvaluatorRole(e.target.value as ClinicianCredential)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-xs print:bg-white print:text-black print:border-gray-300 shadow-sm"
                >
                  {CREDENTIAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{t[opt.key]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-700 font-bold block mb-1">{t.licenseNumber}</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={e => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-600 text-xs font-mono print:bg-white print:text-black print:border-gray-300 shadow-sm"
                  placeholder={t.licensePlaceholder}
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="pt-2">
              <SignatureCanvas
                label={t.signatureLabel}
                clearLabel={t.clearSig}
                initialSignature={signatureUrl}
                lang={lang}
                onChange={url => setSignatureUrl(url)}
              />
              {signatureUrl && (
                <div className="text-[10px] text-emerald-700 flex items-center space-x-1 mt-1 font-mono font-bold">
                  <Check className="w-3 h-3" />
                  <span>{t.sigVerifiedEmbedded}</span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-600 leading-tight italic font-medium">{t.attestationStatement}</p>
          </div>

          {/* Check Code Block */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">{t.sessionHash}</span>
                <div className="font-mono text-[11px] text-emerald-800 break-all select-all font-bold">{sessionHash}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyHash}
              className="shrink-0 text-xs px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold transition shadow-sm min-h-[44px]"
            >
              {copiedHash ? t.hashCopied : t.copyHash}
            </button>
          </div>

          {/* Parent & Caregiver Directives */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 print:bg-gray-100 print:border-gray-300 text-xs space-y-2 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-blue-950 print:text-black flex items-center space-x-1.5">
                <span>{t.parentInstructionsTitle}</span>
              </h4>
              <button
                type="button"
                onClick={handleShareWithParent}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition print:hidden min-h-[44px]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{shareText.shareWithParentBtn}</span>
              </button>
            </div>
            <p className="text-blue-900 print:text-gray-700 leading-relaxed text-[11px] font-medium">{t.parentInstructionsText}</p>
          </div>

          {/* Evaluator Notes Field */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">{t.evaluatorNotes}</h4>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full h-20 p-3 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 print:border-gray-300 print:bg-white print:text-black shadow-sm"
            />
          </div>

          {/* CDC Disclaimer Footer */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-300 text-[11px] text-slate-600 leading-normal print:bg-white print:border-gray-300 print:text-gray-600 font-medium">
            <strong className="text-slate-900 font-bold">{t.nonDiagnosticNotice}</strong> {assessment.triage.nonDiagnosticDisclaimer}
          </div>
        </div>
      </div>

      {manualShareSummary && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-share-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm print:hidden"
        >
          <div className="bg-white border-2 border-slate-900 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-3 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 id="manual-share-modal-title" className="text-sm font-bold uppercase tracking-wide">
                {shareText.manualShareTitle}
              </h3>
              <button
                type="button"
                onClick={() => setManualShareSummary(null)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={shareText.closeManualShare}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              {shareText.manualShareHelp}
            </p>
            <textarea
              readOnly
              value={manualShareSummary}
              onClick={e => (e.target as HTMLTextAreaElement).select()}
              rows={10}
              className="w-full p-3 rounded-xl border-2 border-slate-300 font-mono text-xs bg-slate-50 text-slate-900 focus:outline-none focus:border-slate-900 select-all"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setManualShareSummary(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold min-h-[44px]"
              >
                {shareText.closeManualShare}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

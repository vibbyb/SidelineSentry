// UI strings for roster management, demo mode, and backup import/export
import { SupportedLocale } from './translations';

export const ROSTER_TEXT: Record<SupportedLocale, {
  demoModeBadge: string;
  tryDemoBtn: string;
  demoBannerDesc: string;
  demoBaselineBlocked: string;
  deleteAthleteTooltip: string;
  deleteAthleteTitle: string;
  deleteAthleteWarning: string;
  deleteAthleteConfirm: string;
  cancel: string;
  emptyRosterTitle: string;
  emptyRosterDesc: string;
  addAthleteBtn: string;
  restoreDefaultsBtn: string;
  exportRosterBtn: string;
  importRosterBtn: string;
  importConfirmTitle: string;
  importConfirmWarning: string;
  importConfirmAction: string;
  importSuccess: string;
  importError: string;
}> = {
  en: {
    demoModeBadge: 'Demo Mode',
    tryDemoBtn: 'Try a Demo',
    demoBannerDesc: 'Sample check with simulated healthy motion sensors.',
    demoBaselineBlocked: 'Baselines cannot be overwritten in demo mode.',
    deleteAthleteTooltip: 'Delete athlete profile',
    deleteAthleteTitle: 'Delete Athlete',
    deleteAthleteWarning: 'Are you sure you want to remove this athlete? Their profile and all saved check history will be permanently deleted.',
    deleteAthleteConfirm: 'Delete',
    cancel: 'Cancel',
    emptyRosterTitle: 'Roster is Empty',
    emptyRosterDesc: 'There are no athletes on the roster. Add an athlete or restore the default test athletes to practice.',
    addAthleteBtn: 'Add Athlete',
    restoreDefaultsBtn: 'Restore Default Test Athletes',
    exportRosterBtn: 'Export Roster',
    importRosterBtn: 'Import Roster',
    importConfirmTitle: 'Import Roster Data',
    importConfirmWarning: 'Importing will replace your current roster and checkup history with the backup file. This cannot be undone.',
    importConfirmAction: 'Replace and Import',
    importSuccess: 'Roster backup imported successfully.',
    importError: 'Invalid backup file. Please select a valid SidelineSentry backup file.'
  },
  es: {
    demoModeBadge: 'Modo Demo',
    tryDemoBtn: 'Probar Demostración',
    demoBannerDesc: 'Chequeo de muestra con sensores de movimiento simulados.',
    demoBaselineBlocked: 'Las líneas base no se pueden sobrescribir en modo demo.',
    deleteAthleteTooltip: 'Eliminar perfil de atleta',
    deleteAthleteTitle: 'Eliminar Atleta',
    deleteAthleteWarning: '¿Está seguro de que desea eliminar a este atleta? Su perfil y todo el historial de chequeos se borrarán permanentemente.',
    deleteAthleteConfirm: 'Eliminar',
    cancel: 'Cancelar',
    emptyRosterTitle: 'La Lista está Vacía',
    emptyRosterDesc: 'No hay atletas en la lista. Agregue un atleta o restaure los atletas de prueba predeterminados para practicar.',
    addAthleteBtn: 'Agregar Atleta',
    restoreDefaultsBtn: 'Restaurar Atletas de Prueba Predeterminados',
    exportRosterBtn: 'Exportar Lista',
    importRosterBtn: 'Importar Lista',
    importConfirmTitle: 'Importar Datos de Lista',
    importConfirmWarning: 'La importación reemplazará su lista actual y el historial de chequeos con el archivo de respaldo. Esta acción no se puede deshacer.',
    importConfirmAction: 'Reemplazar e Importar',
    importSuccess: 'Copia de seguridad importada con éxito.',
    importError: 'Archivo de copia no válido. Seleccione un archivo de respaldo válido de SidelineSentry.'
  }
};

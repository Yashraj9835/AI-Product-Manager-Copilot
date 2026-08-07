import { toast } from 'sonner';

export const showFeatureToast = (featureName: string) => {
  toast.success(`${featureName} initiated!`, {
    description: 'Processing your request...',
  });
};

export const showErrorToast = (message: string) => {
  toast.error('Error', {
    description: message,
  });
};

export const showInfoToast = (title: string, message: string) => {
  toast.info(title, {
    description: message,
  });
};

export const handleGeneratePRD = () => {
  showFeatureToast('PRD Generation');
  // This would trigger PRD generation logic
};

export const handleImportData = () => {
  showFeatureToast('Data Import');
  // This would trigger file upload dialog
};

export const handleGenerateRoadmap = () => {
  showFeatureToast('Roadmap Generation');
  // This would trigger roadmap AI generation
};

export const handleReclusterThemes = () => {
  showFeatureToast('Theme Reclustering');
  // This would trigger AI theme clustering
};

export const handleExportPRD = () => {
  showFeatureToast('PRD Export');
  // This would trigger PRD export
};

export const handleCopyPRD = () => {
  toast.success('Copied to clipboard!');
  // This would copy PRD content to clipboard
};

export const handleAddDataSource = () => {
  showFeatureToast('Add Data Source');
  // This would open data source connection dialog
};

export const handleSelectFiles = () => {
  showFeatureToast('File Selection');
  // This would open file picker
};

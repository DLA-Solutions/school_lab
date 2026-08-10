import { ProvisioningImportErrorReport } from 'types/onboarding';

/** Flattens API `error_report` rows into pt-BR messages for the CSV preview step. */
export const formatImportErrorReport = (
  errorReport: ProvisioningImportErrorReport | undefined,
): string[] => {
  if (!errorReport) {
    return [];
  }

  const messages: string[] = [];

  errorReport.file?.forEach((message) => {
    messages.push(message);
  });

  errorReport.rows?.forEach(({ row, errors }) => {
    Object.entries(errors).forEach(([field, fieldErrors]) => {
      fieldErrors.forEach((message) => {
        messages.push(`Linha ${row}, ${field}: ${message}`);
      });
    });
  });

  return messages;
};

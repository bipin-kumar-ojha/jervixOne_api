const getConfig = () => ({
  webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim(),
  webhookSecret: process.env.GOOGLE_SHEETS_WEBHOOK_SECRET?.trim(),
});

export const isGoogleSheetsConfigured = () => {
  const config = getConfig();
  return Boolean(config.webhookUrl && config.webhookSecret);
};

export const appendEmployeeCredentials = async ({
  organizationName,
  employeeId,
  employeeName,
  username,
  temporaryPassword,
  roleName,
}) => {
  const config = getConfig();

  if (!config.webhookUrl || !config.webhookSecret) {
    throw new Error("Google Sheets webhook is not configured");
  }

  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: config.webhookSecret,
      organizationName,
      employeeId: employeeId || "",
      employeeName,
      username,
      temporaryPassword,
      roleName,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await response.text();
  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Google Sheets webhook returned an invalid response (${response.status})`);
  }

  if (!response.ok || result.success !== true) {
    throw new Error(result.message || `Google Sheets webhook failed (${response.status})`);
  }

  return result;
};


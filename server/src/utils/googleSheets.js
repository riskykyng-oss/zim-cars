const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

export const postToGoogleSheet = async (payload) => {
  if (!WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Google Sheets webhook error:', error.message);
  }
};

export const sendWhatsAppMessage = async (phone: string, text: string) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_WA_API_URL;
    const sessionId = process.env.WA_SESSION_ID;
    const apiKey = process.env.WA_API_KEY || '';

    if (!apiUrl || !sessionId) {
      console.warn('WhatsApp API configuration is missing. Skipping message send.');
      return false;
    }

    // Format phone number to WhatsApp format (append @c.us if not present)
    // Also change leading '0' to '62' (Indonesia code) as standard WA numbers need country code
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    if (!formattedPhone.endsWith('@c.us') && !formattedPhone.endsWith('@g.us')) {
      formattedPhone = `${formattedPhone}@c.us`;
    }

    const endpoint = `${apiUrl}/api/sessions/${sessionId}/messages/send-text`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: formattedPhone,
        text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
};

export const sendWhatsAppTemplate = async (phone: string, templateName: string, vars: Record<string, string>) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_WA_API_URL;
    const sessionId = process.env.WA_SESSION_ID;
    const apiKey = process.env.WA_API_KEY || '';

    if (!apiUrl || !sessionId) {
      console.warn('WhatsApp API configuration is missing. Skipping message send.');
      return false;
    }

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }
    if (!formattedPhone.endsWith('@c.us') && !formattedPhone.endsWith('@g.us')) {
      formattedPhone = `${formattedPhone}@c.us`;
    }

    const endpoint = `${apiUrl}/api/sessions/${sessionId}/messages/send-template`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: formattedPhone,
        templateName,
        vars,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WhatsApp API responded with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp template message:', error);
    return false;
  }
};

export default function handler(req: any, res: any) {
  return res.status(200).json({
    status: 'ok',
    time: new Date().toISOString(),
    env: {
      hasDbUrl: Boolean(process.env.DATABASE_URL),
      hasWhatsappToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      hasPhoneId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
      nodeEnv: process.env.NODE_ENV || 'not_set'
    }
  });
}

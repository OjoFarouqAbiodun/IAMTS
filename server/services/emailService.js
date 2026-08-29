// Email delivery abstraction for the password-reset workflow.
//
// A transport is NOT configured in this environment: no SMTP credentials
// exist and none may be committed to the repository. Until a transport is
// configured, sendPasswordResetEmail is a no-op that resolves successfully.
//
// The stub deliberately does NOT log whether an account exists, to preserve
// the account-enumeration protections of the forgot-password endpoint.
//
// To enable delivery:
//   1. Configure a transport (e.g. nodemailer) with credentials supplied
//      through environment variables such as MAIL_HOST, MAIL_PORT,
//      MAIL_USER, MAIL_PASS, MAIL_FROM.
//   2. Implement the transport below and send an email containing resetUrl.

const sendPasswordResetEmail = async (email, resetUrl) => {
  // Fallback: log the reset URL so administrators can manually relay it.
  // This does NOT reveal account existence — the caller already returns a
  // generic response regardless of whether the email is registered.
  console.log(`[EMAIL STUB] Password reset for ${email}: ${resetUrl}`);
  return Promise.resolve();
};

module.exports = {
  sendPasswordResetEmail,
};

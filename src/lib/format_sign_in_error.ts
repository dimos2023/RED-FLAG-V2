export function formatSignInError(isArabic: boolean, message: string): string {
  const normalized: string = message.trim().toLowerCase();
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return isArabic
      ? "البريد أو كلمة المرور غير صحيحة، أو لا يوجد حساب بهذا البريد في المشروع الحالي."
      : "Wrong email or password, or there is no account for this email in the current Supabase project.";
  }
  if (normalized.includes("email not confirmed")) {
    return isArabic
      ? "يرجى تأكيد البريد الإلكتروني من الرابط الذي أرسلناه قبل تسجيل الدخول (أو عطّل تأكيد البريد من إعدادات المصادقة في Supabase للتجربة)."
      : "Confirm your email via the link Supabase sent before signing in (or disable email confirmation in Supabase Auth settings for testing).";
  }
  if (normalized.includes("supabase is not configured")) {
    return message;
  }
  return isArabic ? `تعذر تسجيل الدخول: ${message}` : message;
}

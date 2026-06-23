// 密码规则校验：至少8位，包含字母和数字
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码长度至少8位';
  if (!/[a-zA-Z]/.test(password)) return '密码必须包含字母';
  if (!/\d/.test(password)) return '密码必须包含数字';
  return null;
}

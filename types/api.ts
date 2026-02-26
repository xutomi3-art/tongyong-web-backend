/**
 * API响应的通用结构
 */
export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * GET /api/captcha 的响应数据
 */
export interface CaptchaResponse {
  id: string; // 验证码ID
  svg: string; // Base64编码的SVG图像
}

/**
 * POST /api/contact 的请求体
 */
export interface ContactFormRequest {
  name: string;
  company?: string;
  phone: string;
  email: string;
  message?: string;
  captchaId: string;
  captchaText: string; // 推荐使用
  captcha?: string; // 兼容旧版
}

/**
 * POST /api/admin/login 的请求体
 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/**
 * POST /api/admin/login 的响应数据
 */
export interface AdminLoginResponse {
  token: string;
}

/**
 * POST /api/admin/change-password 的请求体
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

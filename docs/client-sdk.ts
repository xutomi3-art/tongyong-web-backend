/**
 * 通用Web后端客户端SDK
 * 
 * 这个SDK封装了所有API调用，提供类型安全的接口。
 * 使用方法：
 * 
 * ```typescript
 * import { ApiClient } from './client-sdk';
 * 
 * const client = new ApiClient('https://your-domain.com');
 * 
 * // 提交联系表单
 * const captcha = await client.getCaptcha();
 * await client.submitContactForm({
 *   name: '张三',
 *   company: 'JOTO科技',
 *   phone: '13800138000',
 *   email: 'zhangsan@example.com',
 *   message: '我想了解更多信息',
 *   captchaId: captcha.id,
 *   captchaText: '用户输入的验证码'
 * });
 * ```
 */

import type {
  ApiResponse,
  CaptchaResponse,
  ContactFormRequest,
  AdminLoginRequest,
  AdminLoginResponse,
  ChangePasswordRequest
} from '../types/api';

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾的斜杠
  }

  /**
   * 设置认证Token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 通用的API请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  }

  /**
   * 获取验证码
   */
  async getCaptcha(): Promise<CaptchaResponse> {
    const response = await this.request<CaptchaResponse>('/api/captcha');
    return response.data!;
  }

  /**
   * 提交联系表单
   */
  async submitContactForm(data: ContactFormRequest): Promise<void> {
    await this.request('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 管理员登录
   */
  async adminLogin(credentials: AdminLoginRequest): Promise<string> {
    const response = await this.request<AdminLoginResponse>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const token = response.data!.token;
    this.setToken(token);
    return token;
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await this.request('/api/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 获取后台配置
   */
  async getConfig<T = any>(): Promise<T> {
    const response = await this.request<T>('/api/admin/config');
    return response.data!;
  }

  /**
   * 更新后台配置
   */
  async updateConfig(config: any): Promise<void> {
    await this.request('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
}

/**
 * 使用示例
 */
export const example = async () => {
  const client = new ApiClient('https://shanyue.jotoai.com');

  try {
    // 1. 获取验证码
    const captcha = await client.getCaptcha();
    console.log('验证码ID:', captcha.id);
    
    // 2. 提交联系表单
    await client.submitContactForm({
      name: '测试用户',
      company: 'JOTO科技',
      phone: '13800138000',
      email: 'test@jototech.cn',
      message: '测试留言',
      captchaId: captcha.id,
      captchaText: 'ABCD' // 用户输入的验证码
    });
    
    console.log('表单提交成功！');
  } catch (error) {
    console.error('错误:', error.message);
  }
};

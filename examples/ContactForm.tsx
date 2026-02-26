/**
 * React + TypeScript 联系表单示例组件
 * 
 * 使用方法:
 * 1. 复制此文件到你的React项目中
 * 2. 安装类型定义: 将 types/api.ts 复制到你的项目
 * 3. 配置API_BASE为你的后端地址
 * 4. 导入并使用: <ContactForm />
 */

import React, { useState, useEffect } from 'react';
import type { ContactFormRequest, CaptchaResponse } from '../types/api';

const API_BASE = '/api'; // 使用相对路径以利用Vite/Next.js代理

interface ContactFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    message: '',
    captcha: ''
  });

  const [captchaData, setCaptchaData] = useState<CaptchaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const response = await fetch(`${API_BASE}/captcha`);
      const data: CaptchaResponse = await response.json();
      setCaptchaData(data);
    } catch (err) {
      setError('验证码加载失败');
      console.error('Failed to load captcha:', err);
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (!captchaData) {
      setError('验证码未加载');
      setLoading(false);
      return;
    }

    const requestData: ContactFormRequest = {
      name: formData.name,
      company: formData.company,
      phone: formData.phone,
      email: formData.email,
      message: formData.message,
      captchaId: captchaData.id,
      captchaText: formData.captcha  // 使用 captchaText (推荐) 或 captcha
    };

    try {
      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        setFormData({
          name: '',
          company: '',
          phone: '',
          email: '',
          message: '',
          captcha: ''
        });
        loadCaptcha();
        onSuccess?.();
      } else {
        setError(result.error || '提交失败');
        loadCaptcha();
        onError?.(result.error);
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Form submission error:', err);
      onError?.('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-form">
      <h2>联系我们</h2>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          提交成功！我们会尽快与您联系。
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">姓名 *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="请输入您的姓名"
          />
        </div>

        <div className="form-group">
          <label htmlFor="company">公司/机构</label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="请输入公司或机构名称"
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone">电话 *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="请输入联系电话"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">邮箱 *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="请输入电子邮箱"
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">留言 *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="请输入您的留言内容"
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>验证码 *</label>
          <div className="captcha-container">
            {captchaData && (
              <div
                className="captcha-image"
                onClick={loadCaptcha}
                dangerouslySetInnerHTML={{ __html: captchaData.svg }}
                title="点击刷新验证码"
              />
            )}
            <input
              type="text"
              name="captcha"
              value={formData.captcha}
              onChange={handleChange}
              required
              placeholder="请输入验证码"
              maxLength={4}
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '提交中...' : '提交表单'}
        </button>
      </form>

      <style jsx>{`
        .contact-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        input, textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #667eea;
        }

        textarea {
          resize: vertical;
        }

        .captcha-container {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .captcha-image {
          cursor: pointer;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 4px;
        }

        button {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }

        button:hover {
          background: #5568d3;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #fee;
          color: #c33;
          border: 1px solid #fcc;
        }

        .alert-success {
          background: #efe;
          color: #3c3;
          border: 1px solid #cfc;
        }
      `}</style>
    </div>
  );
};

export default ContactForm;

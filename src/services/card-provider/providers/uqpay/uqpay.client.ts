import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UqpayErrorResponse } from './uqpay.types';

export interface UqpayClientConfig {
  apiBaseUrl: string;
  apiToken: string;
  timeout?: number;
  onBehalfOf?: string; // Sub-account ID
}

export interface UqpayRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, any>;
  query?: Record<string, any>;
  idempotencyKey?: string;
}

export interface UqpayApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    httpStatus?: number;
  };
}

export class UqpayClient {
  private readonly logger = new Logger(UqpayClient.name);
  private config: UqpayClientConfig;

  constructor(config: UqpayClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<UqpayClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 发送 API 请求
   */
  async request<T>(options: UqpayRequestOptions): Promise<UqpayApiResponse<T>> {
    const { method, path, body, query, idempotencyKey } = options;

    // 构建 URL
    let url = `${this.config.apiBaseUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      url += `?${params.toString()}`;
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-auth-token': this.config.apiToken,
    };

    // 幂等性 Key (POST/PUT 请求需要)
    if (method === 'POST' || method === 'PUT') {
      headers['x-idempotency-key'] = idempotencyKey || uuidv4();
    }

    // 子账户代理
    if (this.config.onBehalfOf) {
      headers['x-on-behalf-of'] = this.config.onBehalfOf;
    }

    // 请求配置
    const fetchOptions: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    this.logger.debug(`UQPAY Request: ${method} ${url}`);
    if (body) {
      this.logger.debug(`Request Body: ${JSON.stringify(body)}`);
    }

    try {
      // 创建超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      fetchOptions.signal = controller.signal;

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseText = await response.text();
      this.logger.debug(`UQPAY Response: ${response.status} ${responseText}`);

      // 解析响应
      let responseData: any;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { message: responseText };
      }

      // 检查 HTTP 状态码
      if (!response.ok) {
        const errorResponse = responseData as UqpayErrorResponse;
        return {
          success: false,
          error: {
            code: errorResponse.error_code || `HTTP_${response.status}`,
            message:
              errorResponse.error_message ||
              errorResponse.message ||
              `HTTP ${response.status} Error`,
            httpStatus: response.status,
          },
        };
      }

      return {
        success: true,
        data: responseData as T,
      };
    } catch (error) {
      // 处理网络错误
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `Request timeout after ${this.config.timeout}ms`,
          },
        };
      }

      this.logger.error(`UQPAY Request failed: ${error.message}`);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network request failed',
        },
      };
    }
  }

  /**
   * GET 请求快捷方法
   */
  async get<T>(
    path: string,
    query?: Record<string, any>,
  ): Promise<UqpayApiResponse<T>> {
    return this.request<T>({ method: 'GET', path, query });
  }

  /**
   * POST 请求快捷方法
   */
  async post<T>(
    path: string,
    body?: Record<string, any>,
    idempotencyKey?: string,
  ): Promise<UqpayApiResponse<T>> {
    return this.request<T>({ method: 'POST', path, body, idempotencyKey });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 使用获取持卡人列表作为健康检查（获取1条记录）
      const response = await this.get('/v1/issuing/cardholders', {
        page_size: 1,
        page_number: 1,
      });
      return response.success;
    } catch {
      return false;
    }
  }
}

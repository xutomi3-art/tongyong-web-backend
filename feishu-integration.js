// 飞书集成模块
const axios = require('axios');

/**
 * 发送消息到飞书机器人
 * @param {string} webhookUrl - 飞书webhook URL
 * @param {Object} message - 消息内容
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendToFeishuBot(webhookUrl, message) {
  if (!webhookUrl) {
    console.log('未配置飞书Webhook，跳过发送');
    return false;
  }

  try {
    const response = await axios.post(webhookUrl, {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: message.title || '新消息通知'
          },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: message.content || ''
            }
          }
        ]
      }
    });

    if (response.data.StatusCode === 0 || response.data.code === 0) {
      console.log('✓ 飞书消息发送成功');
      return true;
    } else {
      console.error('飞书消息发送失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('发送到飞书失败:', error.message);
    return false;
  }
}

/**
 * 同步数据到飞书表格
 * @param {Object} config - 配置信息
 * @param {Object} data - 要同步的数据
 * @returns {Promise<boolean>} 是否同步成功
 */
async function syncToFeishuTable(config, data) {
  const feishuConfig = config.feishuConfig || {};
  
  if (!feishuConfig.appId || !feishuConfig.appSecret || !feishuConfig.tableId) {
    console.log('飞书表格配置不完整，跳过同步');
    return false;
  }

  try {
    // 获取tenant_access_token
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: feishuConfig.appId,
      app_secret: feishuConfig.appSecret
    });

    if (tokenResponse.data.code !== 0) {
      throw new Error('获取飞书access token失败: ' + tokenResponse.data.msg);
    }

    const accessToken = tokenResponse.data.tenant_access_token;

    // 添加记录到表格
    const recordResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${feishuConfig.tableId}/tables/${feishuConfig.tableSheetId}/records`,
      {
        fields: {
          '姓名': data.name || '',
          '邮箱': data.email || '',
          '电话': data.phone || '',
          '公司': data.company || '',
          '职位': data.position || '',
          '留言': data.message || '',
          '提交时间': data.submittedAt || new Date().toISOString(),
          '来源': data.source || 'website'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (recordResponse.data.code === 0) {
      console.log('✓ 同步到飞书表格成功');
      return true;
    } else {
      throw new Error('同步失败: ' + JSON.stringify(recordResponse.data));
    }

  } catch (error) {
    console.error('同步到飞书表格失败:', error.response?.data || error.message);
    return false;
  }
}

module.exports = {
  sendToFeishuBot,
  syncToFeishuTable
};

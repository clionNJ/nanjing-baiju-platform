const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 配置CORS
app.use(cors({
  origin: 'https://clionnj.github.io/nanjing-baiju-platform', // 替换为实际前端域名
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// 解析JSON请求体
app.use(express.json());

// NLP API代理端点
app.post('/api/nlp/query', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: '缺少请求参数: text' });
    }

    // 调用通义千问API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-max',
        input: {
          prompt: text
        },
        parameters: {
          stream: true, // 启用流式响应
          temperature: 0.7,
          top_p: 0.9
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
        },
        responseType: 'stream'
      }
    );

    // 将流式响应转发给前端
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    response.data.on('data', (chunk) => {
      res.write(chunk);
    });

    response.data.on('end', () => {
      res.end();
    });

  } catch (error) {
    console.error('NLP API调用错误:', error);
    res.status(500).json({
      error: '处理请求时发生错误',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`代理服务器运行在 http://localhost:${PORT}`);
});
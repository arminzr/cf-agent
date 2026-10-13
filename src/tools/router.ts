// ─────────────────────────────────────────────────
// Tool Router — registers all tools, executes by name
// ─────────────────────────────────────────────────

import type { Env, ToolDefinition, ToolResult } from '../types';
import { webSearch } from './search';
import { codeExec } from './code';
import { getWeather } from './weather';
import { getCrypto } from './crypto';
import { getNews } from './news';
import { imageGen } from './image';
import { textToSpeech } from './tts';
import { speechToText } from './stt';
import { translateText } from './translate';
import { urlShorten } from './url';
import { qrCode } from './qr';
import { youtubeTranscript } from './youtube';
import { getMaps } from './maps';
import { getCalendar } from './calendar';
import { getDollarRate } from './dollar';
import { ocrImage } from './ocr';
import { generateChart } from './charts';

export class ToolRouter {
  // ─── Tool Definitions (OpenAI-compatible) ───

  static getAllTools(): ToolDefinition[] {
    return [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'جستجوی وب برای اطلاعات روزمره. پارامتر: query (رشته)',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string', description: 'عبارت جستجو' } },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'code_exec',
          description: 'اجرای کد در sandbox لینوکس (E2B). پارامتر: code, language',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'کد برای اجرا' },
              language: { type: 'string', description: 'زبان: python, javascript, bash, etc' },
            },
            required: ['code'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'weather',
          description: 'آب و هوا برای هر شهر. پارامتر: city, days?',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'نام شهر' },
              days: { type: 'number', description: 'تعداد روز‌های پیش‌بینی (1-7)' },
            },
            required: ['city'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'crypto',
          description: 'قیمت ارز دیجیتال. پارامتر: coin (bitcoin, ethereum, etc)',
          parameters: {
            type: 'object',
            properties: { coin: { type: 'string', description: 'نام ارز: bitcoin, ethereum, dogecoin...' } },
            required: ['coin'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'news',
          description: 'آخرین اخبار فارسی از منابع ایرانی',
          parameters: {
            type: 'object',
            properties: { category: { type: 'string', description: 'دسته: politics, economy, sports, tech' } },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'image_gen',
          description: 'تولید تصویر با AI از متن توصیفی. پارامتر: prompt',
          parameters: {
            type: 'object',
            properties: { prompt: { type: 'string', description: 'توصیف تصویر' } },
            required: ['prompt'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'tts',
          description: 'تبدیل متن به صوت. پارامتر: text, voice? (fa-IR-FaridNeural)',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'متن' },
              voice: { type: 'string', description: 'نام صدا (default: fa-IR-FaridNeural)' },
            },
            required: ['text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'translate',
          description: 'ترجمه متن. پارامتر: text, from, to (en, fa, ar, fr, de, es)',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              from: { type: 'string' },
              to: { type: 'string' },
            },
            required: ['text', 'to'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'url_shorten',
          description: 'کوتاه‌سازی لینک. پارامتر: url',
          parameters: {
            type: 'object',
            properties: { url: { type: 'string' } },
            required: ['url'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'qr_code',
          description: 'ساخت QR Code. پارامتر: data (متن یا لینک)',
          parameters: {
            type: 'object',
            properties: { data: { type: 'string' } },
            required: ['data'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'youtube_transcript',
          description: 'استخراج متن ویدیو یوتیوب. پارامتر: videoId',
          parameters: {
            type: 'object',
            properties: { videoId: { type: 'string', description: 'ID ویدیو' } },
            required: ['videoId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'maps',
          description: 'جستجوی موقعیت و آدرس. پارامتر: query (نام مکان)',
          parameters: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'calendar',
          description: 'تاریخ شمسی امروز و تبدیل تاریخ',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'today, convert' },
              date: { type: 'string', description: 'تاریخ برای تبدیل (YYYY-MM-DD)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'dollar_rate',
          description: 'قیمت دلار و طلا در بازار ایران',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'stt',
          description: 'تبدیل صدا به متن (Speech-to-Text). پارامتر: audioUrl (URL فایل صوتی), language? (fa, en, ar, ...)',
          parameters: {
            type: 'object',
            properties: {
              audioUrl: { type: 'string', description: 'URL فایل صوتی' },
              language: { type: 'string', description: 'زبان (default: fa)' },
            },
            required: ['audioUrl'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'ocr',
          description: 'استخراج متن از عکس (OCR). پارامتر: imageUrl (URL تصویر)',
          parameters: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string', description: 'URL تصویر' },
            },
            required: ['imageUrl'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'chart',
          description: 'ساخت نمودار (bar, line, pie, doughnut, radar). پارامتر: type, labels[], values[]',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'نوع نمودار: bar, line, pie, doughnut, radar' },
              labels: { type: 'array', items: { type: 'string' }, description: 'برچسب‌ها' },
              values: { type: 'array', items: { type: 'number' }, description: 'مقادیر' },
              title: { type: 'string', description: 'عنوان نمودار' },
            },
            required: ['type', 'labels', 'values'],
          },
        },
      },
    ];
  }

  // ─── Execute Tool by Name ───

  static async execute(env: Env, name: string, args: any): Promise<ToolResult> {
    const start = Date.now();
    try {
      let result: any;
      switch (name) {
        case 'web_search': result = await webSearch(args.query); break;
        case 'code_exec': result = await codeExec(args.code, args.language, env); break;
        case 'weather': result = await getWeather(args.city, args.days); break;
        case 'crypto': result = await getCrypto(args.coin || 'bitcoin'); break;
        case 'news': result = await getNews(args.category); break;
        case 'image_gen': result = await imageGen(args.prompt); break;
        case 'tts': result = await textToSpeech(args.text, args.voice, env); break;
        case 'translate': result = await translateText(args.text, args.from, args.to); break;
        case 'url_shorten': result = await urlShorten(args.url); break;
        case 'qr_code': result = await qrCode(args.data); break;
        case 'youtube_transcript': result = await youtubeTranscript(args.videoId); break;
        case 'maps': result = await getMaps(args.query); break;
        case 'calendar': result = await getCalendar(args.action, args.date); break;
        case 'dollar_rate': result = await getDollarRate(); break;
        case 'stt': result = await speechToText(args.audioUrl, args.language || 'fa', env); break;
        case 'ocr': result = await ocrImage(args.imageUrl, env); break;
        case 'chart': result = await generateChart(args.type || 'bar', { labels: args.labels, datasets: [{ label: args.title || 'Data', data: args.values }] }, undefined, args.title); break;
        default: return { success: false, error: `Unknown tool: ${name}`, data: null };
      }
      return { success: true, data: result, latency_ms: Date.now() - start };
    } catch (err: any) {
      return { success: false, error: err.message, data: null, latency_ms: Date.now() - start };
    }
  }
}

import React from 'react';
import { Image } from 'antd';
import { optimizeImage } from '../../../utils/imageOptimizer';

export const getMarkdownComponents = () => ({
  p: ({ children }) => (
    <div style={{ 
      margin: '0 0 12px 0', // 增加下边距到 12px
      lineHeight: '1.6',
      display: 'block' // 确保块级显示
    }}>
      {children}
    </div>
  ),
  h1: ({ children }) => (
    <h1 style={{ margin: '16px 0 8px 0', fontSize: '1.5em', fontWeight: 'bold' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ margin: '14px 0 6px 0', fontSize: '1.3em', fontWeight: 'bold' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ margin: '12px 0 4px 0', fontSize: '1.1em', fontWeight: 'bold' }}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 style={{ margin: '10px 0 4px 0', fontSize: '1.05em', fontWeight: 'bold' }}>
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 style={{ margin: '8px 0 4px 0', fontSize: '1em', fontWeight: 'bold' }}>
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 style={{ margin: '8px 0 4px 0', fontSize: '0.95em', fontWeight: 'bold' }}>
      {children}
    </h6>
  ),
  // 图片组件 - 支持点击放大
  img: ({ src, alt, ...props }) => {
    console.log('ReactMarkdown img component called with:');
    console.log('- src:', src);
    console.log('- alt:', alt);
    console.log('- src type:', typeof src);
    console.log('- src startsWith blob:', src && src.startsWith('blob:'));
    
    // 检查 src 是否为空或未定义
    if (!src) {
      console.warn('ReactMarkdown: Image src is empty or undefined');
      return (
        <div style={{ 
          width: '200px', 
          height: '100px', 
          backgroundColor: '#f5f5f5', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '2px dashed #d9d9d9',
          borderRadius: '8px',
          margin: '8px 0',
          color: '#999'
        }}>
          图片链接为空
        </div>
      );
    }
    
    // 对于 blob URL，不进行优化处理
    const imageSrc = src.startsWith('blob:') ? src : optimizeImage(src, 'chat');
    console.log('Final imageSrc:', imageSrc);
    
    return (
      <Image
        src={imageSrc}
        alt={alt}
        style={{
          maxWidth: '30vw',
          maxHeight: '40vh', // 只限制图片的最大高度
          height: 'auto',
          borderRadius: '8px',
          margin: '8px 0',
          display: 'block'
        }}
        preview={{
          mask: '预览图片',
          src: src // 使用原始URL进行预览
        }}
        onError={(e) => {
          console.error('Image load error:', e);
          console.error('Failed src:', imageSrc);
        }}
        onLoad={() => {
          console.log('Image loaded successfully:', imageSrc);
        }}
        {...props}
      />
    );
  },
  // 链接组件
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: '#1890ff',
        textDecoration: 'none',
        borderBottom: '1px solid #1890ff'
      }}
      {...props}
    >
      {children}
    </a>
  ),
  // 无序列表
  ul: ({ children }) => (
    <ul style={{ 
      margin: '8px 0', 
      paddingLeft: '20px',
      listStyleType: 'disc'
    }}>
      {children}
    </ul>
  ),
  // 有序列表
  ol: ({ children }) => (
    <ol style={{ 
      margin: '8px 0', 
      paddingLeft: '20px',
      listStyleType: 'decimal'
    }}>
      {children}
    </ol>
  ),
  // 列表项
  li: ({ children }) => (
    <li style={{ 
      margin: '4px 0',
      lineHeight: '1.6'
    }}>
      {children}
    </li>
  ),
  // 引用块
  blockquote: ({ children }) => (
    <blockquote style={{
      margin: '8px 0',
      padding: '8px 16px',
      borderLeft: '4px solid #1890ff',
      backgroundColor: '#262626',
      borderRadius: '0 4px 4px 0',
      fontStyle: 'italic'
    }}>
      {children}
    </blockquote>
  ),
  // 表格
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#262626',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ backgroundColor: '#434343' }}>
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody>
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr style={{ borderBottom: '1px solid #434343' }}>
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '8px 12px',
      textAlign: 'left',
      fontWeight: 'bold',
      color: '#ffffff'
    }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '8px 12px',
      color: '#ffffff'
    }}>
      {children}
    </td>
  ),
  // 分隔线
  hr: () => (
    <hr style={{
      margin: '16px 0',
      border: 'none',
      borderTop: '1px solid #434343'
    }} />
  ),
  // 强调文本
  strong: ({ children }) => (
    <strong style={{ fontWeight: 'bold', color: '#ffffff' }}>
      {children}
    </strong>
  ),
  // 斜体文本
  em: ({ children }) => (
    <em style={{ fontStyle: 'italic', color: '#ffffff' }}>
      {children}
    </em>
  ),
  // 删除线
  del: ({ children }) => (
    <del style={{ textDecoration: 'line-through', opacity: 0.7 }}>
      {children}
    </del>
  ),
  // 代码块和内联代码
  code: ({ inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          style={{
            backgroundColor: '#434343',
            color: '#ffffff',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '0.9em',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          margin: '8px 0',
          border: '1px solid #434343',
          display: 'block'
        }}
      >
        <code
          style={{
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '0.9em',
            color: '#ffffff'
          }}
          {...props}
        >
          {children}
        </code>
      </pre>
    );
  }
});
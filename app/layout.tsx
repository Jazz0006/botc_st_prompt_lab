import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '钟楼研习所 · AI 说书人训练工作台', description: '保留合理世界，识别体验风险。阵容、信息方案与逐夜演练的中文工作台。', icons: { icon: '/favicon.svg' } };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}

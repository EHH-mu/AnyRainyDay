/**
 * # 雨滴窗口配置选项 🌧️
 * - 定义RainyWindow实例的初始化参数
 * - 所有参数均为可选，提供默认值
 */
export interface RainyWindowOptions {
  /** # 雨滴强度 💧 范围 0-1 */
  intensity?: number
  /** # 雨滴速度 ⚡ 范围 0-10 */
  speed?: number
  /** # 亮度调节 ☀️ 范围 0-1 */
  brightness?: number
  /** # 法线强度 🎯 范围 0-3 */
  normal?: number
  /** # 缩放比例 🔍 范围 0.1-3 */
  zoom?: number
  /** # 模糊强度 🌫️ 范围 0-10 */
  blurIntensity?: number
  /** # 模糊迭代次数 🔁 范围 1-64 */
  blurIterations?: number
  /** # 平移效果开关 🔄 */
  panning?: boolean
  /** # 后处理开关 ✨ */
  postProcessing?: boolean
  /** # 闪电效果开关 ⚡ */
  lightning?: boolean
  /** # 纹理填充开关 🖼️ */
  textureFill?: boolean
  /** # 帧率设置 🎬 范围 15-120 */
  fps?: number
  /** # 背景图片URL 🖼️ */
  backgroundImage?: string
  /** # 效果混合强度，范围 0-1 */
  effectMix?: number
  /** # 背景保护强度，范围 0-1；1 表示仅在雨滴区域应用效果 */
  backgroundProtection?: number
  /** # 渲染像素比例；导出原始尺寸时建议设为 1 */
  pixelRatio?: number
}

export default RainyWindowOptions

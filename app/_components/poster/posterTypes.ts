export type PosterElementType = "image" | "text";

export interface PosterElementBase {
  id: string;
  type: PosterElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  // 图层顺序：数值越大越在上层（相当于“index”概念）
  zIndex: number;

  // 变量键：用于生成页向该元素填充内容（模板内唯一）
  variableKey: string;
}

export interface PosterImageElement extends PosterElementBase {
  type: "image";
  src: string;
}

export interface PosterTextElement extends PosterElementBase {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  maxLines: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
}

export type PosterElement = PosterImageElement | PosterTextElement;


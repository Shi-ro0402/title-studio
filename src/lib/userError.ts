// 利用者にそのまま見せてよいエラー（理由がわかる日本語のメッセージを持つ）

export class UserFacingError extends Error {
  constructor(message: string, public code = "unknown") {
    super(message);
  }
}

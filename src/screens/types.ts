export interface Screen {
  title: string
  /** Рисует экран в root, возвращает функцию очистки (снять подписки/таймеры). */
  mount(root: HTMLElement): () => void
}

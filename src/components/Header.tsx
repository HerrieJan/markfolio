import { Menu, Moon, Sun } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSearchQuery, toggleSidebar } from '../store/appSlice';
import { useThemeStore } from '../store/themeStore';

export function Header() {
  const dispatch = useAppDispatch();
  const searchQuery = useAppSelector((s) => s.app.searchQuery);
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-white px-3 dark:border-border-dark dark:bg-surface-dark-muted">
      <button
        type="button"
        onClick={() => dispatch(toggleSidebar())}
        className="rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="サイドバー切替"
      >
        <Menu size={20} />
      </button>

      <div className="text-sm font-semibold tracking-tight text-gray-800 dark:text-gray-100">
        Markfolio
      </div>

      <div className="flex min-w-0 flex-1 justify-center px-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="ドキュメントを検索..."
          className="w-full max-w-xl rounded-md border border-border bg-surface-muted px-3 py-1.5 text-sm outline-none ring-blue-500 placeholder:text-gray-400 focus:ring-2 dark:border-border-dark dark:bg-surface-dark dark:placeholder:text-gray-500"
        />
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        className="ml-auto shrink-0 rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label="テーマ切替"
        title={theme === 'light' ? 'ダークモード' : 'ライトモード'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </header>
  );
}

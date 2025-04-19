import { FC, ReactNode, useState, Dispatch, SetStateAction } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface LayoutProps {
  children: ReactNode;
  currentTool: string;
  setCurrentTool: Dispatch<SetStateAction<string>>;
}

const Layout: FC<LayoutProps> = ({ children, currentTool, setCurrentTool }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        currentTool={currentTool}
        setCurrentTool={setCurrentTool}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            {/* Content area with subtle shadow and glass effect */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl min-h-[calc(100vh-8rem)]">
              <div className="p-6">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

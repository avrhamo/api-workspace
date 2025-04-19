import Layout from './components/layout/Layout';
import Base64Tool from './components/tools/Base64Tool';
import ApiTester from './components/tools/api-tester/ApiTester';
import { useTheme } from './hooks/useTheme';

function App() {
  const { currentTool, setCurrentTool } = useTheme();

  const renderTool = () => {
    switch (currentTool) {
      case 'base64':
        return <Base64Tool />;
      case 'api-tester':
        return <ApiTester />;
      default:
        return (
          <div className="h-full flex items-center justify-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">
              Select a tool to get started
            </h1>
          </div>
        );
    }
  };

  return (
    <Layout currentTool={currentTool} setCurrentTool={setCurrentTool}>
      {renderTool()}
    </Layout>
  );
}

export default App;
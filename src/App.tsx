import Layout from './components/layout/Layout';
import Base64Tool from './components/tools/base64';
import { ApiTester } from './components/tools/api-tester/ApiTester';
import RSATool from './components/tools/rsa';
import KeytabTool from './components/tools/keytab';
import KafkaTester from './components/tools/kafka-tester';
import RegexTool from './components/tools/regex';
import TimeUnitsTool from './components/tools/time-units';
import BSONTool from './components/tools/bson';
import HelmSecrets from './components/tools/helm-secrets';
import { useTheme } from './hooks/useTheme';

function App() {
  const { currentTool, setCurrentTool } = useTheme();

  const renderTool = () => {
    switch (currentTool) {
      case 'base64':
        return <Base64Tool />;
      case 'rsa':
        return <RSATool />;
      case 'keytab':
        return <KeytabTool />;
      case 'api-tester':
        return <ApiTester />;
      case 'kafka':
        return <KafkaTester />;
      case 'regex':
        return <RegexTool />;
      case 'time':
        return <TimeUnitsTool />;
      case 'bson':
        return <BSONTool />;
      case 'helm-secrets':
        return <HelmSecrets />;
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
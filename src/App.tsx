import { useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { KanbanBoard } from "./components/KanbanBoard";
import { Layout } from "./components/Layout";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <Layout>
      <KanbanBoard />
    </Layout>
  );
};

export default App;

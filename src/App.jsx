// Ponto de entrada visual do app: apenas monta o LifeQuest.
// Toda a lógica (estado, navegação, telas) mora em src/LifeQuest.jsx.
import LifeQuest from "./LifeQuest";
import InstallPrompt from "./InstallPrompt";

function App() {
  return (
    <>
      <LifeQuest />
      <InstallPrompt />
    </>
  );
}

export default App;

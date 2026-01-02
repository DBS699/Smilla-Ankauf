import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import MainPage from "@/pages/MainPage";
import HistoryPage from "@/pages/HistoryPage";
import ReceiptPage from "@/pages/ReceiptPage";

function App() {
  return (
    <div className="App paper-bg min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;

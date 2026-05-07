import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Courts are now managed inside each club — redirect to clubs list
export default function CourtsPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/clubs", { replace: true }); }, []);
  return null;
}

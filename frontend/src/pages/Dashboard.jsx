import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "../components/Layout";

export default function Dashboard() {
  const navigate = useNavigate();

  const createMeeting = async () => {
    const res = await axios.post(
      "http://localhost:5001/api/meetings/create",
      { title: "Meeting" }
    );

    navigate(`/meeting/${res.data._id}`);
  };

  return (
    <Layout>
      <button
        onClick={createMeeting}
        className="bg-blue-500 px-4 py-2 rounded"
      >
        + New Meeting
      </button>
    </Layout>
  );
}
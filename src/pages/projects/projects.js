import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProjectsStyles from "./projects.module.css";
import ProjectPicker from "../../components/Common/FilePicker/projectPicker";
import { getProjectList } from "../../util/petitionHandler";

const prefixPublicUrlIfNeeded = (p) => {
  const url = p?.imageUrl;
  if (!url) return p;
  if (typeof url === "string" && url.startsWith("/")) {
    return { ...p, imageUrl: `${process.env.PUBLIC_URL}${url}` };
  }
  return p;
};

// Project middle page for selecting workspace
const Projects = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await getProjectList();
        if (!alive) return;

        const normalized = Array.isArray(data) ? data.map(prefixPublicUrlIfNeeded) : [];
        setProjects(normalized);
      } catch (e) {
        if (!alive) return;
        setLoadError("Failed to load projects");
        setProjects([]);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const handleSelectProject = (project) => {
    navigate("/nodes", { state: { projectId: project.id } });
  };

  return (
    <div className={ProjectsStyles.page}>
      <ProjectPicker
        modalTitle="Select a project"
        projects={projects}
        isLoading={isLoading}
        errorMessage={loadError}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
};

export default Projects;

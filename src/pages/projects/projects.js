// Projects page for selecting research projects
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ProjectsStyles from "./projects.module.css";
import ProjectPicker from "../../components/Common/FilePicker/projectPicker";

const Projects = () => {
  const navigate = useNavigate();

  const projects = useMemo(() => [
    {
      id: "1111-1111-1111-1111",
      name: "STRATIF-AI",
      description:
        "A scalable platform for continuous stratification to improve prevention, treatment, and rehabilitation of stroke patients using world-unique digital twins and AI.",
      membersCount: 15,
      nodesCount: 2,
      dcatCount: 3,
      lastAccess: "17-12-2025",
      imageUrl: `${process.env.PUBLIC_URL}/stratif.png`,
      badge: "Active",
    },
  ], []
  );

  const handleSelectProject = (project) => {
    navigate("/nodes", { state: { projectId: project.id } });
  };

  return (
    <div className={ProjectsStyles.page}>
      <ProjectPicker
        modalTitle="Select a project"
        projects={projects}
        onSelectProject={handleSelectProject}
      />
    </div>
  );
};

export default Projects;

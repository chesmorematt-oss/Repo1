import React, { useCallback, useEffect, useState } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { DesktopInstallProvider } from './context/DesktopInstallContext';
import { InstallDesktopModal } from './components/InstallDesktopModal';
import { Layout } from './components/Layout';
import type { NavTab } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { ProjectsListView } from './components/ProjectsListView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { ProjectFormModal } from './components/ProjectFormModal';
import { ComparatorView } from './components/ComparatorView';
import { OrdinancesView } from './components/OrdinancesView';
import { apiFetch, uploadSitePlanFile } from './lib/api';
import { PROJECT_STATUS_META } from './lib/format';
import type { Project, ProjectMeasurements, ProjectStatus } from './types';

const WorkspaceShell: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'projects' || tabParam === 'comparator' || tabParam === 'ordinances') {
        return tabParam;
      }
    }
    return 'dashboard';
  });
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Create / Edit Project Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [prefillMeasurements, setPrefillMeasurements] = useState<ProjectMeasurements | null>(
    null
  );

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiFetch<{ projects: Project[] }>('/api/projects');
      setProjects(res.projects);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load projects.', 'error');
    } finally {
      setProjectsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setProjectsLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  const handleNavigate = (tab: NavTab) => {
    setSelectedProjectId(null);
    setActiveTab(tab);
  };

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setActiveTab('projects');
  };

  const handleOpenCreateModal = (initialM?: ProjectMeasurements) => {
    setEditingProject(null);
    setPrefillMeasurements(initialM || null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setPrefillMeasurements(null);
    setModalOpen(true);
  };

  const handleSaveProjectModal = async (
    payload: Record<string, unknown>,
    isEdit: boolean,
    id?: number,
    sitePlanFiles?: File[]
  ) => {
    let targetProjectId: number;
    let permitLabel: string;

    if (isEdit && id) {
      const res = await apiFetch<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      targetProjectId = id;
      permitLabel = res.project.permit_number;
      setProjects((curr) => curr.map((p) => (p.id === id ? res.project : p)));
    } else {
      const res = await apiFetch<{ project: Project }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      targetProjectId = res.project.id;
      permitLabel = res.project.permit_number;
      setProjects((curr) => [res.project, ...curr]);
      setSelectedProjectId(res.project.id);
      setActiveTab('projects');
    }

    if (sitePlanFiles && sitePlanFiles.length > 0) {
      for (let i = 0; i < sitePlanFiles.length; i++) {
        await uploadSitePlanFile(targetProjectId, sitePlanFiles[i], {
          plan_type: 'construction_site_plan',
          revision_label: `Rev ${i + 1}`,
        });
      }
    }

    setDetailRefreshKey((k) => k + 1);
    const planSuffix =
      sitePlanFiles && sitePlanFiles.length > 0
        ? ` (${sitePlanFiles.length} site plan${sitePlanFiles.length > 1 ? 's' : ''} attached)`
        : '';
    showToast(
      isEdit
        ? `Updated ${permitLabel} & re-synced ordinance checks${planSuffix}.`
        : `Created permit checklist ${permitLabel}${planSuffix}.`
    );
    fetchProjects();
  };

  // Optimistic status update from Projects list
  const handleQuickStatusChange = async (project: Project, nextStatus: ProjectStatus) => {
    const prev = [...projects];
    setProjects((curr) =>
      curr.map((p) => (p.id === project.id ? { ...p, status: nextStatus } : p))
    );
    try {
      const res = await apiFetch<{ project: Project }>(`/api/projects/${project.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setProjects((curr) => curr.map((p) => (p.id === project.id ? res.project : p)));
      showToast(
        `${project.permit_number} marked ${PROJECT_STATUS_META[nextStatus].label}.`
      );
    } catch (err) {
      setProjects(prev);
      showToast(err instanceof Error ? err.message : 'Status update failed.', 'error');
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const res = await apiFetch<{ project: Project }>(`/api/projects/${project.id}/duplicate`, {
        method: 'POST',
      });
      setProjects((curr) => [res.project, ...curr]);
      setSelectedProjectId(res.project.id);
      setActiveTab('projects');
      showToast(`Duplicated as ${res.project.permit_number}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to duplicate project.', 'error');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const prev = [...projects];
    setProjects((curr) => curr.filter((p) => p.id !== project.id));
    if (selectedProjectId === project.id) {
      setSelectedProjectId(null);
    }
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      showToast(`Deleted ${project.permit_number}.`, 'info');
    } catch (err) {
      setProjects(prev);
      showToast(err instanceof Error ? err.message : 'Failed to delete project.', 'error');
    }
  };

  const attentionCount = projects.filter(
    (p) => p.status === 'corrections_required' || p.status === 'variance_needed'
  ).length;

  return (
    <Layout
      activeTab={activeTab}
      onNavigate={handleNavigate}
      onNewProject={() => handleOpenCreateModal()}
      projectCounts={{ total: projects.length, attention: attentionCount }}
    >
      {selectedProjectId !== null ? (
        <ProjectDetailView
          projectId={selectedProjectId}
          refreshKey={detailRefreshKey}
          onBack={() => setSelectedProjectId(null)}
          onEditProject={handleOpenEditModal}
          onProjectUpdated={fetchProjects}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
        />
      ) : activeTab === 'dashboard' ? (
        <DashboardView
          projects={projects}
          loading={projectsLoading}
          onSelectProject={handleSelectProject}
          onNavigate={handleNavigate}
          onNewProject={() => handleOpenCreateModal()}
        />
      ) : activeTab === 'projects' ? (
        <ProjectsListView
          projects={projects}
          loading={projectsLoading}
          onSelectProject={handleSelectProject}
          onNewProject={() => handleOpenCreateModal()}
          onEditProject={handleOpenEditModal}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
          onQuickStatusChange={handleQuickStatusChange}
        />
      ) : activeTab === 'comparator' ? (
        <ComparatorView
          onConvertToProject={(measurements) => handleOpenCreateModal(measurements)}
        />
      ) : (
        <OrdinancesView />
      )}

      {modalOpen && (
        <ProjectFormModal
          editingProject={editingProject}
          initialMeasurements={prefillMeasurements}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProjectModal}
        />
      )}
    </Layout>
  );
};

export function App() {
  return (
    <ToastProvider>
      <DesktopInstallProvider>
        <WorkspaceShell />
        <InstallDesktopModal />
      </DesktopInstallProvider>
    </ToastProvider>
  );
}

export default App;

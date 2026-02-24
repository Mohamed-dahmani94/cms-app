"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, RefreshCw, ArrowLeft, ChevronDown, ChevronRight, CheckCircle, Clock, Play, Upload, FileImage, X, FileText, Plus, AlertTriangle } from "lucide-react"

interface Subtask {
  id: string
  code: string
  designation: string
  duration: number
  completionPercentage: number
  engineerEmail?: string
  isReserve?: boolean
}

interface Task {
  id: string
  code: string
  designation: string
  duration: number
  subTasks: Subtask[]
}

interface LaunchedArticle {
  id: string
  code: string
  designation: string
  realStartDate: string
  realEndDate?: string
  pvStatus?: 'SANS_RESERVE' | 'AVEC_RESERVE' | null
  isClosed?: boolean
  tasks: Task[]
  lot: {
    code: string
    name: string
  }
  project: {
    id: string
    name: string
  }
}

export default function TasksPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [articles, setArticles] = useState<LaunchedArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())

  const toggleProject = (projectName: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      if (next.has(projectName)) next.delete(projectName)
      else next.add(projectName)
      return next
    })
  }

  // Upload state
  const [uploadingSubtask, setUploadingSubtask] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useState<HTMLInputElement | null>(null)

  // PV Modal state
  const [pvModalOpen, setPvModalOpen] = useState(false)
  const [pvArticleId, setPvArticleId] = useState<string | null>(null)
  const [pvProjectId, setPvProjectId] = useState<string | null>(null)
  const [pvType, setPvType] = useState<'SANS_RESERVE' | 'AVEC_RESERVE' | null>(null)
  const [reserves, setReserves] = useState<string[]>([''])
  const [pvFiles, setPvFiles] = useState<FileList | null>(null)
  const [submittingPv, setSubmittingPv] = useState(false)

  // Filters
  const [filterReserves, setFilterReserves] = useState(false)

  const fetchLaunchedTasks = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/tasks/launched")
      if (res.ok) {
        const data = await res.json()
        setArticles(data)
      }
    } catch (error) {
      console.error("Failed to fetch launched tasks", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLaunchedTasks()
  }, [])

  const toggleArticle = (id: string) => {
    setExpandedArticles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const updateSubtaskProgress = async (subtaskId: string, progress: number) => {
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionPercentage: progress })
      })
      if (res.ok) {
        fetchLaunchedTasks()
      }
    } catch (error) {
      console.error("Failed to update progress", error)
    }
  }

  // Upload files for completed subtask
  const uploadFiles = async (subtaskId: string, projectId: string, files: FileList, articleId?: string) => {
    if (files.length === 0) return

    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('subtaskId', subtaskId)
        formData.append('category', 'PHOTO') // or determine based on file type
        if (articleId) formData.append('articleId', articleId)

        const res = await fetch(`/api/projects/${projectId}/documents`, {
          method: 'POST',
          body: formData
        })

        if (!res.ok) {
          const errText = await res.text()
          console.error(`Failed to upload ${file.name}: ${res.status} ${errText}`)
          alert(`Échec upload ${file.name}: ${res.statusText}`)
        }
      }

      alert(`${files.length} fichier(s) téléversé(s) avec succès!`)
      setUploadingSubtask(null)
    } catch (error) {
      console.error("Failed to upload files", error)
      alert("Erreur lors du téléversement")
    } finally {
      setUploading(false)
    }
  }

  // Handle reserve input changes
  const handleReserveChange = (index: number, value: string) => {
    const newReserves = [...reserves]
    newReserves[index] = value
    setReserves(newReserves)
  }

  // Add new reserve field
  const addReserveField = () => {
    setReserves([...reserves, ''])
  }

  // Submit PV
  const submitPV = async () => {
    if (!pvArticleId || !pvType) return

    setSubmittingPv(true)
    try {
      let uploadedUrls: string[] = []

      // 1. Upload all selected files if any
      if (pvFiles && pvFiles.length > 0 && pvProjectId) {
        for (let i = 0; i < pvFiles.length; i++) {
          const file = pvFiles[i]
          const formData = new FormData()
          formData.append('file', file)
          formData.append('category', 'PV_RECEPTION')
          formData.append('articleId', pvArticleId)

          const res = await fetch(`/api/projects/${pvProjectId}/documents`, {
            method: 'POST',
            body: formData
          })

          if (res.ok) {
            const doc = await res.json()
            uploadedUrls.push(doc.url)
          } else {
            console.error(`Failed to upload PV file: ${file.name}`)
          }
        }
      }

      // 2. Update Article Status
      const updateData: any = {
        pvStatus: pvType,
        pvDate: new Date(),
        pvFileUrl: uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null,
        isClosed: pvType === 'SANS_RESERVE' // Close if no reserves
      }

      const res = await fetch(`/api/articles/${pvArticleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(errorData.error || "Failed to update article")
      }

      // 3. If reserves, create subtasks for them
      if (pvType === 'AVEC_RESERVE') {
        const article = articles.find(a => a.id === pvArticleId)
        let reserveTaskId = article?.tasks.find(t => t.designation === "Levée des réserves")?.id

        if (!reserveTaskId && article && article.tasks.length > 0) {
          reserveTaskId = article.tasks[0].id
        }

        if (reserveTaskId) {
          for (const reserve of reserves) {
            if (reserve.trim()) {
              await fetch(`/api/tasks-article/${reserveTaskId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  designation: `RÉSERVE: ${reserve}`,
                  duration: 5,
                  isReserve: true
                })
              })
            }
          }
        }
      }

      setPvModalOpen(false)
      setPvFiles(null) // Reset files
      fetchLaunchedTasks()
      alert(pvType === 'SANS_RESERVE' ? "Tâche clôturée avec succès!" : "Réserves enregistrées. Veuillez traiter les nouvelles sous-tâches.")

    } catch (error) {
      console.error("Failed to submit PV", error)
      alert("Erreur lors de l'enregistrement du PV")
    } finally {
      setSubmittingPv(false)
    }
  }

  const calculateTaskProgress = (task: Task) => {
    if (!task.subTasks || task.subTasks.length === 0) return 0
    // Filter out reserves for main progress calculation to keep it at 100%
    const mainSubtasks = task.subTasks.filter(st => !st.isReserve)
    if (mainSubtasks.length === 0) return 0 // Or handle differently if ONLY reserves exist in a task? 
    // If a task contains only reserves (e.g. dedicated task), maybe we should return 100% or 0%?
    // Let's assume for now mixed content. If only reserves, this returns 0 which might be confusing.
    // Let's refine: If task has ONLY reserves, its "Work" progress is N/A or 100%? 
    // User wants "Work" to stay 100%. So if only reserves are present, it implies old work is done.
    if (mainSubtasks.length === 0 && task.subTasks.length > 0) return 100

    const total = mainSubtasks.reduce((sum, st) => sum + (st.completionPercentage || 0), 0)
    return Math.round(total / mainSubtasks.length)
  }

  const calculateArticleProgress = (article: LaunchedArticle) => {
    if (!article.tasks || article.tasks.length === 0) return 0
    const total = article.tasks.reduce((sum, t) => sum + calculateTaskProgress(t), 0)
    return Math.round(total / article.tasks.length)
  }

  const calculateReservesProgress = (article: LaunchedArticle) => {
    let totalReserves = 0
    let doneReserves = 0

    article.tasks.forEach(task => {
      task.subTasks?.forEach(st => {
        if (st.isReserve) {
          totalReserves++
          if (st.completionPercentage === 100) doneReserves++
        }
      })
    })

    if (totalReserves === 0) return null // No reserves
    return Math.round((doneReserves / totalReserves) * 100)
  }

  const getReserveCount = (article: LaunchedArticle) => {
    let count = 0
    article.tasks.forEach(t => t.subTasks?.forEach(st => { if (st.isReserve && st.completionPercentage < 100) count++ }))
    return count
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-green-500'
    if (progress >= 50) return 'text-blue-500'
    if (progress > 0) return 'text-orange-500'
    return 'text-gray-400'
  }

  // Natural sort function for codes like "1", "1.1", "1.2", "2", "2.1"
  const naturalSort = (a: string, b: string) => {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      if (aVal !== bVal) return aVal - bVal
    }
    return 0
  }

  const filteredArticles = articles.filter(a =>
    (a.designation.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.project?.name?.toLowerCase().includes(search.toLowerCase())) &&
    (!filterReserves || a.pvStatus === 'AVEC_RESERVE')
  ).sort((a, b) => naturalSort(a.code, b.code))

  // Filter for current user's subtasks if not admin
  const userEmail = session?.user?.email
  const isAdmin = session?.user?.role === "ADMIN"

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Mes Tâches</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterReserves ? "default" : "outline"}
              size="sm"
              className={`text-xs ${filterReserves ? 'bg-orange-500 hover:bg-orange-600 border-orange-200 text-white' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}
              onClick={() => setFilterReserves(!filterReserves)}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {filterReserves ? 'Tout afficher' : 'Planning Réserves'}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchLaunchedTasks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Chargement...</div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Play className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune tâche lancée.</p>
            <p className="text-sm mt-2">Les tâches apparaîtront ici une fois lancées depuis "Gestion de Projet".</p>
          </div>
        ) : (
          Object.entries(
            filteredArticles.reduce((acc, article) => {
              const projectName = article.project?.name || "Projet Inconnu"
              if (!acc[projectName]) acc[projectName] = []
              acc[projectName].push(article)
              return acc
            }, {} as Record<string, typeof articles>)
          ).map(([projectName, projectArticles]) => {
            const isCollapsed = collapsedProjects.has(projectName)

            return (
              <div key={projectName} className="space-y-4 mb-8">
                <div
                  className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 pr-2 rounded transition-colors"
                  onClick={() => toggleProject(projectName)}
                >
                  <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{projectName}</h2>
                  <Badge variant="outline" className="ml-2">{projectArticles.length} tâches</Badge>
                </div>

                {!isCollapsed && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {projectArticles.map(article => {
                      const isExpanded = expandedArticles.has(article.id)
                      const articleProgress = calculateArticleProgress(article)
                      const daysSinceStart = Math.floor((Date.now() - new Date(article.realStartDate).getTime()) / (1000 * 60 * 60 * 24))

                      return (
                        <Card key={article.id} className="overflow-hidden">
                          <div
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => toggleArticle(article.id)}
                          >
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-indigo-500">{article.code}</Badge>
                                <span className="font-semibold">{article.designation}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{article.lot?.code}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-green-600 border-green-300">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Lancé il y a {daysSinceStart}j
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-bold flex items-center justify-end gap-1 ${getProgressColor(articleProgress)}`}>
                                <span>{articleProgress}%</span>
                                {article.pvStatus === 'AVEC_RESERVE' && (
                                  <span className="text-lg text-orange-500 ml-1" title="Avancement Réserves">
                                    / {calculateReservesProgress(article) || 0}%
                                  </span>
                                )}
                              </div>

                              <div className="w-28 mt-1">
                                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                                  <span>Travaux</span>
                                </div>
                                <Progress value={articleProgress} className="h-2" />
                              </div>

                              {article.pvStatus === 'AVEC_RESERVE' && (
                                <div className="w-28 mt-2 mb-2">
                                  <div className="flex justify-between text-[10px] text-orange-600 mb-0.5 font-medium">
                                    <span>Levée Réserves</span>
                                  </div>
                                  <Progress value={calculateReservesProgress(article) || 0} className="h-2 bg-orange-100 dark:bg-orange-950/30 [&>div]:bg-orange-500" />
                                </div>
                              )}

                              {/* PV Button if 100% and NO PV YET */}
                              {articleProgress === 100 && !article.pvStatus && (
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPvArticleId(article.id)
                                    setPvProjectId(article.project?.id)
                                    setPvType('SANS_RESERVE')
                                    setReserves([''])
                                    setPvModalOpen(true)
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" /> PV Réception
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Tasks */}
                          {isExpanded && (
                            <CardContent className="pt-0 border-t">
                              {article.tasks?.length > 0 ? (
                                [...article.tasks]
                                  .sort((a, b) => naturalSort(a.code, b.code))
                                  .map(task => {
                                    const isTaskExpanded = expandedTasks.has(task.id)
                                    const taskProgress = calculateTaskProgress(task)

                                    // Filter subtasks for current user if not admin
                                    const visibleSubtasks = isAdmin
                                      ? task.subTasks
                                      : task.subTasks?.filter(st => !st.engineerEmail || st.engineerEmail === userEmail)

                                    if (!isAdmin && (!visibleSubtasks || visibleSubtasks.length === 0)) {
                                      return null
                                    }

                                    // Sort visible subtasks by code
                                    const sortedSubtasks = visibleSubtasks ? [...visibleSubtasks].sort((a, b) => naturalSort(a.code, b.code)) : []

                                    return (
                                      <div key={task.id} className="border-b last:border-b-0 py-2">
                                        <div
                                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
                                          onClick={() => toggleTask(task.id)}
                                        >
                                          <Button variant="ghost" size="sm" className="p-0 h-5 w-5">
                                            {isTaskExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                          </Button>
                                          <Badge variant="secondary">{task.code}</Badge>
                                          <span className="flex-1 text-sm">{task.designation}</span>
                                          <span className={`font-semibold ${getProgressColor(taskProgress)}`}>
                                            {taskProgress}%
                                          </span>
                                        </div>

                                        {/* Subtasks */}
                                        {isTaskExpanded && sortedSubtasks && sortedSubtasks.length > 0 && (
                                          <div className="ml-8 mt-2 space-y-2">
                                            {sortedSubtasks.map(subtask => (
                                              <div key={subtask.id} className={`flex items-center gap-2 p-2 rounded ${subtask.isReserve ? 'bg-orange-50 dark:bg-orange-950/30 border-l-2 border-orange-500' : 'bg-gray-50 dark:bg-gray-900'}`}>
                                                {subtask.isReserve && (
                                                  <Badge variant="outline" className="text-[10px] h-5 px-1 border-orange-200 text-orange-600 bg-orange-100 mr-1">RÉSERVE</Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs">{subtask.code}</Badge>
                                                <span className="flex-1 text-sm">{subtask.designation}</span>
                                                {subtask.engineerEmail && (
                                                  <Badge variant="outline" className="text-xs text-purple-500">
                                                    {subtask.engineerEmail.split('@')[0]}
                                                  </Badge>
                                                )}
                                                <div className="flex items-center gap-2">
                                                  <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={subtask.completionPercentage || 0}
                                                    onChange={(e) => updateSubtaskProgress(subtask.id, parseInt(e.target.value))}
                                                    className={`w-20 h-2 ${subtask.isReserve ? 'accent-orange-500' : 'accent-blue-500'}`}
                                                  />
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={subtask.completionPercentage || 0}
                                                    onChange={(e) => {
                                                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                                                      updateSubtaskProgress(subtask.id, val)
                                                    }}
                                                    className={`w-14 text-center text-sm font-semibold border rounded px-1 py-0.5 ${getProgressColor(subtask.completionPercentage)}`}
                                                  />
                                                  <span className="text-sm">%</span>
                                                  {subtask.completionPercentage === 100 && (
                                                    <>
                                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 px-2 text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
                                                        onClick={() => setUploadingSubtask(uploadingSubtask === subtask.id ? null : subtask.id)}
                                                        disabled={uploading}
                                                      >
                                                        <Upload className="h-3 w-3" />
                                                        {uploading && uploadingSubtask === subtask.id ? 'Envoi...' : 'Photos/Docs'}
                                                      </Button>
                                                    </>
                                                  )}
                                                </div>

                                                {/* File upload area for 100% subtasks */}
                                                {subtask.completionPercentage === 100 && uploadingSubtask === subtask.id && (
                                                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <FileImage className="h-4 w-4 text-blue-500" />
                                                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ajouter photos/documents</span>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 w-5 p-0 ml-auto"
                                                        onClick={() => setUploadingSubtask(null)}
                                                      >
                                                        <X className="h-3 w-3" />
                                                      </Button>
                                                    </div>
                                                    <input
                                                      type="file"
                                                      multiple
                                                      accept="image/*,.pdf,.doc,.docx"
                                                      onChange={(e) => {
                                                        const files = e.target.files
                                                        if (files && files.length > 0) {
                                                          if (article.project?.id) {
                                                            // Reset input value to allow re-selecting same file if needed (via state usage typically, but here simple trigger)
                                                            uploadFiles(subtask.id, article.project.id, files, article.id)
                                                          } else {
                                                            console.error("Project ID missing for article", article)
                                                            alert("Erreur système : Impossible d'identifier le projet pour cet article. Veuillez recharger la page.")
                                                          }
                                                        }
                                                      }}
                                                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">Photos, PDF, Word - plusieurs fichiers possibles</p>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })
                              ) : (
                                <p className="text-sm text-gray-500 py-2">Aucune tâche définie.</p>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* PV Modal */}
      {pvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">PV de Réception</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Type de réception</label>
              <div className="flex gap-2">
                <Button
                  variant={pvType === 'SANS_RESERVE' ? 'default' : 'outline'}
                  className={`flex-1 ${pvType === 'SANS_RESERVE' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setPvType('SANS_RESERVE')}
                >
                  Sans Réserve
                </Button>
                <Button
                  variant={pvType === 'AVEC_RESERVE' ? 'default' : 'outline'}
                  className={`flex-1 ${pvType === 'AVEC_RESERVE' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                  onClick={() => setPvType('AVEC_RESERVE')}
                >
                  Avec Réserve
                </Button>
              </div>
            </div>

            {pvType && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Documents / Photos PV</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setPvFiles(e.target.files)}
                    className="hidden"
                    id="pv-file-upload"
                  />
                  <label htmlFor="pv-file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 block">
                      {pvFiles && pvFiles.length > 0
                        ? `${pvFiles.length} fichier(s) sélectionné(s)`
                        : "Cliquez pour ajouter photos ou documents du PV"}
                    </span>
                    <span className="text-xs text-gray-400 block mt-1">
                      Photos, PDF, Excel, Word acceptés
                    </span>
                  </label>
                </div>
              </div>
            )}

            {pvType === 'AVEC_RESERVE' && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium">Liste des réserves</label>
                {reserves.map((reserve, idx) => (
                  <Input
                    key={idx}
                    value={reserve}
                    onChange={(e) => handleReserveChange(idx, e.target.value)}
                    placeholder={`Réserve ${idx + 1}...`}
                    className="text-sm"
                  />
                ))}
                <Button size="sm" variant="ghost" className="text-blue-600" onClick={addReserveField}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une réserve
                </Button>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPvModalOpen(false)}>Annuler</Button>
              <Button onClick={submitPV} disabled={submittingPv} className="bg-indigo-600 text-white">
                {submittingPv ? 'Enregistrement...' : 'Enregistrer PV'}
              </Button>
            </div>

            {pvType === 'SANS_RESERVE' && (
              <p className="mt-2 text-xs text-green-600 text-center">
                La tâche sera clôturée définitivement.
              </p>
            )}
            {pvType === 'AVEC_RESERVE' && (
              <p className="mt-2 text-xs text-orange-600 text-center">
                Des sous-tâches de réserve seront créées.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

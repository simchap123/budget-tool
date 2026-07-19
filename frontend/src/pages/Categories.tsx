import { useState, useEffect } from 'react'
import axios from 'axios'
import { Trash2 } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'

interface Category {
  id: string
  name: string
  color: string
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']

export function Categories() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', color: '#ef4444' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const filter = encodeURIComponent(`(userId='${auth.record.id}')`)
      const response = await axios.get(
        `${apiUrl}/collections/categories/records?filter=${filter}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      ).catch(() => ({ data: { items: [] } }))

      setCategories(response.data.items || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    setSubmitting(true)
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      if (editingId) {
        await axios.patch(
          `${apiUrl}/collections/categories/records/${editingId}`,
          { name: formData.name, color: formData.color },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Category updated')
      } else {
        await axios.post(
          `${apiUrl}/collections/categories/records`,
          { name: formData.name, color: formData.color, userId: auth.record.id },
          { headers: { Authorization: `Bearer ${auth.token}` } }
        )
        toast.success('Category created')
      }

      setFormData({ name: '', color: '#ef4444' })
      setShowForm(false)
      setEditingId(null)
      await fetchCategories()
    } catch (err: any) {
      console.error('Error saving category:', err)
      toast.error('Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      await axios.delete(
        `${apiUrl}/collections/categories/records/${id}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      )

      toast.success('Category deleted')
      setDeleteId(null)
      await fetchCategories()
    } catch (err) {
      console.error('Error deleting category:', err)
      toast.error('Failed to delete category')
    }
  }

  const handleEditCategory = (cat: Category) => {
    setEditingId(cat.id)
    setFormData({ name: cat.name, color: cat.color })
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-ink-400">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 page-enter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg">Categories</h1>
          <p className="mt-2 text-ink-400">Manage your budget categories</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ name: '', color: '#ef4444' })
            setShowForm(!showForm)
          }}
          className="btn-primary py-2 px-4"
        >
          {showForm ? '✕ Cancel' : '+ New'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mt-6 card p-6 animate-fade-in">
          <h3 className="text-lg font-normal text-ink-50 mb-4">
            {editingId ? 'Edit Category' : 'New Category'}
          </h3>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">Name</label>
              <input
                type="text"
                placeholder="e.g., Groceries"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="block text-body-sm font-normal text-ink-200 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full border-2 transition-transform ${
                      formData.color === color
                        ? 'border-white scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2"
            >
              {submitting ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
            </button>
          </form>
        </div>
      )}

      {/* Categories Grid */}
      <div className="mt-8">
        {categories.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ink-400">No categories yet</p>
            <p className="mt-1 text-body-sm text-ink-500">Create categories to organize your budget</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat.id} className="card p-4 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <p className="font-normal text-ink-50">{cat.name}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEditCategory(cat)}
                    aria-label={`Edit ${cat.name}`}
                    className="p-1 hover:bg-ink-700 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    aria-label={`Delete ${cat.name}`}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category?"
        footer={
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => deleteId && handleDeleteCategory(deleteId)}
              className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        }
      >
        <p className="text-ink-300">
          Are you sure you want to delete this category? Any transactions in this category will not be affected.
        </p>
      </Modal>
    </div>
  )
}

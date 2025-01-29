// Home.vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArticleDB, type ListOpts } from '@/db/article'
import type { Article } from '@/types'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const articles = ref<Article[]>([])
const loading = ref(true)
const sortField = ref<'lastModified' | 'title' | 'publishedAt'>('lastModified')
const sortOrder = ref<'asc' | 'desc'>('desc')

const listOpts = computed(() => ({
  orderBy: sortField.value,
  order: sortOrder.value
}))

const toggleSort = (field: typeof sortField.value) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  loadArticles()
}

const loadArticles = async () => {
  const db = new ArticleDB()
  articles.value = await db.list(listOpts.value)
}

onMounted(async () => {
  await loadArticles()
  loading.value = false
})

const createArticle = () => router.push({ name: 'editor' })
</script>

<template>
  <div>
      <h1>Articles</h1>
      <button @click="createArticle">New Article</button>
      <table>
      <thead>
      <tr>
        <th colspan="1" class="width-auto">
          <a class="table-header-href" :class="{ 'sort-key': sortField === 'title' }" href="#"
            @click="toggleSort('title')"
          >
            Title <span v-if="sortField === 'title'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </a>
        </th>
        <th class="width-min" style="min-width:165px">
          <a class="table-header-href" :class="{ 'sort-key': sortField === 'lastModified' }" href="#"
            @click="toggleSort('lastModified')"
          >
            Last Modified <span v-if="sortField === 'lastModified'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </a>
        </th>

        <th class="width-min" style="min-width:160px">
          <a class="table-header-href" :class="{ 'sort-key': sortField === 'publishedAt' }" href="#"
            @click="toggleSort('publishedAt')"
          >
            Published At <span v-if="sortField === 'publishedAt'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </a>
        </th>
      </tr>
    </thead>
    <tbody v-if="loading" class="text-gray-500">
      <tr>
        <td colspan="3">
          Loading articles...
        </td>
      </tr>
    </tbody>
    <tbody v-else-if="articles.length === 0">
      <tr>
        <td colspan="3">No articles yet. Create your first one!</td>
      </tr>
    </tbody>
    <tbody v-else>
      <tr v-for="article in articles" :key="article.id">
        <td>
          <a class="font-semibold" href="#" @click="router.push(`/editor/${article.id}`)">
            {{ article.title || 'Untitled' }}
          </a>
          <span class="meta">ID: {{  article.id }}</span>
          <span class="meta">LOCAL: {{  article.syncStatus }}</span>
          <span class="meta">PDS: {{ article.published ? 'PUBLISHED' : '(not published)' }}</span>
        </td>
        <td>
          <span>{{ new Intl.DateTimeFormat('en-US', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Los_Angeles',
                  timeZoneName: 'short'
                }).format(article.lastModified) }}
          </span>
        </td>
        <td>
          <span></span>
          <span v-if="article.publishedAt && article.published">
            {{ new Intl.DateTimeFormat('en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Los_Angeles',
                timeZoneName: 'short'
              }).format(article.publishedAt) }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
  </div>
</template>
import { createRouter, createWebHistory } from 'vue-router'
import Explore from '../views/Explore.vue'
import Gig from '../views/Gig.vue'
import Play from '../views/Play.vue'
import Library from '../views/Library.vue'

const routes = [
  { path: '/', redirect: '/explore' },
  { path: '/explore', name: 'Explore', component: Explore },
  { path: '/gig',     name: 'Gig',     component: Gig },
  { path: '/play',    name: 'Play',    component: Play },
  { path: '/library', name: 'Library', component: Library },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

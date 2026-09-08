/**
 * SISTEMA DE PROGRAMACIÓN DE POSTS CADA 3 DÍAS
 * Soluciona el problema de "contenido de poco valor" en Google AdSense
 * Evita publicaciones múltiples en el mismo día que parecen spam
 */

const POST_SCHEDULE = {
  // Próxima publicación programada
  nextPublishDate: localStorage.getItem('pn_next_publish') || new Date().toISOString(),
  
  // Intervalo entre publicaciones en milisegundos (3 días)
  INTERVAL_MS: 3 * 24 * 60 * 60 * 1000, // 259,200,000 ms
  
  // Cola de posts pendientes
  queue: JSON.parse(localStorage.getItem('pn_post_queue')) || [],
  
  /**
   * Calcula la próxima fecha de publicación
   * @returns {Date} Fecha en que se debe publicar
   */
  getNextPublishDate() {
    const next = new Date(this.nextPublishDate);
    return next;
  },
  
  /**
   * Verifica si es tiempo de publicar
   * @returns {boolean} true si debe publicar ahora
   */
  shouldPublishNow() {
    const now = new Date();
    const nextDate = this.getNextPublishDate();
    return now >= nextDate && this.queue.length > 0;
  },
  
  /**
   * Añade un post a la cola de publicación
   * @param {object} post - Datos del post a publicar
   */
  addToQueue(post) {
    this.queue.push({
      ...post,
      queuedAt: new Date().toISOString(),
      scheduledFor: this.calculateScheduleDate()
    });
    
    this.saveQueue();
    console.log(`📅 Post añadido a la cola. Publicación programada para: ${this.calculateScheduleDate()}`);
  },
  
  /**
   * Calcula la fecha para el siguiente post en la cola
   * @returns {string} ISO date string
   */
  calculateScheduleDate() {
    const slots = this.queue.length;
    const futureDate = new Date(new Date().getTime() + (slots * this.INTERVAL_MS));
    return futureDate.toISOString();
  },
  
  /**
   * Publica el siguiente post de la cola
   */
  async publishNext() {
    if (!this.shouldPublishNow() || this.queue.length === 0) {
      return { success: false, reason: 'Not time to publish yet' };
    }
    
    const post = this.queue.shift();
    
    try {
      // Actualizar index.html con el nuevo post
      await this.addPostToIndex(post);
      
      // Actualizar sitemap
      await this.updateSitemap(post);
      
      // Establecer siguiente fecha de publicación
      const nextDate = new Date(new Date().getTime() + this.INTERVAL_MS);
      this.nextPublishDate = nextDate.toISOString();
      localStorage.setItem('pn_next_publish', this.nextPublishDate);
      
      this.saveQueue();
      
      console.log(`✅ Post publicado: ${post.title}`);
      console.log(`⏱️ Siguiente publicación: ${nextDate.toLocaleString('es-ES')}`);
      
      return { success: true, post, nextPublish: nextDate };
    } catch (error) {
      console.error('❌ Error publicando post:', error);
      // Devolver post a la cola
      this.queue.unshift(post);
      this.saveQueue();
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Obtiene estadísticas de la cola
   */
  getStats() {
    const nextDate = this.getNextPublishDate();
    const now = new Date();
    const daysUntilNext = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));
    
    return {
      postsEnCola: this.queue.length,
      proximaPublicacion: nextDate.toLocaleString('es-ES'),
      diasHasta: daysUntilNext,
      proximoPost: this.queue[0]?.title || 'Ninguno'
    };
  },
  
  /**
   * Guarda la cola en localStorage
   */
  saveQueue() {
    localStorage.setItem('pn_post_queue', JSON.stringify(this.queue));
  },
  
  /**
   * Método para agregar post al index.html
   * Nota: En un sitio dinámico, esto se haría mediante API
   */
  async addPostToIndex(post) {
    // Esta función depende de cómo generes dinámicamente el HTML
    // Por ahora registramos en localStorage
    const publishedPosts = JSON.parse(localStorage.getItem('pn_published_posts')) || [];
    publishedPosts.push({
      ...post,
      publishedAt: new Date().toISOString()
    });
    localStorage.setItem('pn_published_posts', JSON.stringify(publishedPosts));
  },
  
  /**
   * Actualiza el sitemap con el nuevo post
   */
  async updateSitemap(post) {
    // El sitemap debería regenerarse cuando se publica
    console.log('📍 Sitemap se actualizará automáticamente en siguiente build');
  },
  
  /**
   * Reinicia el sistema (útil para testing)
   */
  reset() {
    localStorage.removeItem('pn_next_publish');
    localStorage.removeItem('pn_post_queue');
    this.nextPublishDate = new Date().toISOString();
    this.queue = [];
  }
};

// Verificar automáticamente cada hora si debe publicar
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (POST_SCHEDULE.shouldPublishNow()) {
      POST_SCHEDULE.publishNext();
    }
  }, 60 * 60 * 1000); // Cada 1 hora
}

// Exportar para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = POST_SCHEDULE;
}

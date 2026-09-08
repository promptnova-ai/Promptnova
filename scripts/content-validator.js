/**
 * VALIDADOR DE CONTENIDO PARA ADSENSE
 * Asegura que cada post cumple con las reglas de calidad
 */

const CONTENT_VALIDATOR = {
  // Requisitos mínimos
  REQUIREMENTS: {
    MIN_WORDS: 2000,
    MIN_HEADINGS: 3,
    MIN_PARAGRAPHS: 5,
    MIN_IMAGES: 2,
    MIN_INTERNAL_LINKS: 2,
    MIN_EXTERNAL_LINKS: 3,
    MIN_EXAMPLES: 2,
    META_DESCRIPTION_MIN: 150,
    META_DESCRIPTION_MAX: 160,
    TITLE_MIN: 30,
    TITLE_MAX: 60,
    READING_TIME_MIN: 7 // minutos
  },

  /**
   * Valida un post completo
   */
  validatePost(post) {
    const errors = [];
    const warnings = [];

    // Validar título
    const titleLength = post.title?.length || 0;
    if (titleLength < this.REQUIREMENTS.TITLE_MIN) {
      errors.push(`❌ Título muy corto (${titleLength} caracteres). Mínimo: ${this.REQUIREMENTS.TITLE_MIN}`);
    }
    if (titleLength > this.REQUIREMENTS.TITLE_MAX) {
      warnings.push(`⚠️ Título muy largo (${titleLength} caracteres). Máximo: ${this.REQUIREMENTS.TITLE_MAX}`);
    }

    // Validar descripción
    const descLength = post.description?.length || 0;
    if (descLength < this.REQUIREMENTS.META_DESCRIPTION_MIN) {
      errors.push(`❌ Descripción muy corta (${descLength} caracteres). Mínimo: ${this.REQUIREMENTS.META_DESCRIPTION_MIN}`);
    }
    if (descLength > this.REQUIREMENTS.META_DESCRIPTION_MAX) {
      errors.push(`❌ Descripción muy larga (${descLength} caracteres). Máximo: ${this.REQUIREMENTS.META_DESCRIPTION_MAX}`);
    }

    // Validar palabras
    const wordCount = this.countWords(post.content || '');
    if (wordCount < this.REQUIREMENTS.MIN_WORDS) {
      errors.push(`❌ Contenido muy corto (${wordCount} palabras). Mínimo: ${this.REQUIREMENTS.MIN_WORDS}`);
    }

    // Validar estructura
    const headings = (post.content?.match(/<h[2-3]>/gi) || []).length;
    if (headings < this.REQUIREMENTS.MIN_HEADINGS) {
      errors.push(`❌ Muy pocas secciones (${headings} H2/H3). Mínimo: ${this.REQUIREMENTS.MIN_HEADINGS}`);
    }

    // Validar imágenes
    const images = (post.content?.match(/<img/gi) || []).length;
    if (images < this.REQUIREMENTS.MIN_IMAGES) {
      warnings.push(`⚠️ Muy pocas imágenes (${images}). Recomendado: ${this.REQUIREMENTS.MIN_IMAGES}`);
    }

    // Validar enlaces internos
    const internalLinks = (post.content?.match(/href="\/.*?"/gi) || []).length;
    if (internalLinks < this.REQUIREMENTS.MIN_INTERNAL_LINKS) {
      warnings.push(`⚠️ Pocos enlaces internos (${internalLinks}). Mínimo: ${this.REQUIREMENTS.MIN_INTERNAL_LINKS}`);
    }

    // Validar enlaces externos
    const externalLinks = (post.content?.match(/href="https?:\/\/(?!promptnova)/gi) || []).length;
    if (externalLinks < this.REQUIREMENTS.MIN_EXTERNAL_LINKS) {
      warnings.push(`⚠️ Pocos enlaces externos (${externalLinks}). Mínimo: ${this.REQUIREMENTS.MIN_EXTERNAL_LINKS}`);
    }

    // Validar ejemplos/código
    const codeBlocks = (post.content?.match(/<code>|<pre>/gi) || []).length;
    if (codeBlocks < this.REQUIREMENTS.MIN_EXAMPLES) {
      warnings.push(`⚠️ Pocos ejemplos de código (${codeBlocks}). Mínimo: ${this.REQUIREMENTS.MIN_EXAMPLES}`);
    }

    // Validar tags
    if (!post.tags || post.tags.length < 3) {
      warnings.push(`⚠️ Muy pocas etiquetas. Mínimo: 3`);
    }

    // Validar categoría
    if (!post.category) {
      errors.push(`❌ Categoría no asignada`);
    }

    // Validar que sea original
    if (this.isPossibleDuplicate(post)) {
      errors.push(`❌ Posible contenido duplicado detectado`);
    }

    return {
      isValid: errors.length === 0,
      wordCount,
      headings,
      images,
      internalLinks,
      externalLinks,
      errors,
      warnings,
      score: this.calculateScore(errors, warnings)
    };
  },

  /**
   * Cuenta palabras en texto
   */
  countWords(text) {
    // Remover HTML
    const clean = text.replace(/<[^>]*>/g, '');
    // Remover espacios múltiples
    const words = clean.trim().split(/\s+/);
    return words.filter(w => w.length > 0).length;
  },

  /**
   * Detecta posibles duplicados
   */
  isPossibleDuplicate(post) {
    // Obtener posts publicados
    const published = JSON.parse(localStorage.getItem('pn_published_posts')) || [];
    
    // Comparar título
    const titleMatch = published.some(p => 
      p.title.toLowerCase() === post.title.toLowerCase()
    );
    
    // Comparar descripción (más de 70% similar)
    const descSimilarity = published.some(p => {
      const similarity = this.calculateSimilarity(
        p.description?.toLowerCase() || '',
        post.description?.toLowerCase() || ''
      );
      return similarity > 0.7;
    });

    return titleMatch || descSimilarity;
  },

  /**
   * Calcula similitud entre dos strings (algoritmo Levenshtein simplificado)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  },

  /**
   * Calcula distancia de edición
   */
  getEditDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  },

  /**
   * Calcula puntuación de calidad (0-100)
   */
  calculateScore(errors, warnings) {
    let score = 100;
    score -= errors.length * 15; // -15 por cada error
    score -= warnings.length * 5; // -5 por cada aviso
    return Math.max(0, score);
  },

  /**
   * Genera reporte visual
   */
  generateReport(validation) {
    console.clear();
    console.log('%c📊 VALIDACIÓN DE CONTENIDO ADSENSE', 'font-size: 18px; font-weight: bold; color: #7c3aed;');
    console.log('='.repeat(50));
    
    console.log(`\n✍️ Palabras: ${validation.wordCount} (Mínimo: ${this.REQUIREMENTS.MIN_WORDS})`);
    console.log(`📌 Secciones: ${validation.headings} (Mínimo: ${this.REQUIREMENTS.MIN_HEADINGS})`);
    console.log(`🖼️ Imágenes: ${validation.images} (Mínimo: ${this.REQUIREMENTS.MIN_IMAGES})`);
    console.log(`🔗 Enlaces internos: ${validation.internalLinks} (Mínimo: ${this.REQUIREMENTS.MIN_INTERNAL_LINKS})`);
    console.log(`🌐 Enlaces externos: ${validation.externalLinks} (Mínimo: ${this.REQUIREMENTS.MIN_EXTERNAL_LINKS})`);
    
    if (validation.errors.length > 0) {
      console.log(`\n%c❌ ERRORES (${validation.errors.length}):`, 'color: #ef4444; font-weight: bold;');
      validation.errors.forEach(err => console.log(`   ${err}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(`\n%c⚠️ AVISOS (${validation.warnings.length}):`, 'color: #f59e0b; font-weight: bold;');
      validation.warnings.forEach(warn => console.log(`   ${warn}`));
    }
    
    const statusColor = validation.isValid ? '#10b981' : '#ef4444';
    const status = validation.isValid ? '✅ APROBADO' : '❌ RECHAZADO';
    console.log(`\n%c${status}`, `color: ${statusColor}; font-size: 16px; font-weight: bold;`);
    console.log(`%cPuntuación: ${validation.score}/100`, 'font-size: 14px; font-weight: bold;');
    console.log('='.repeat(50));
  }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONTENT_VALIDATOR;
}

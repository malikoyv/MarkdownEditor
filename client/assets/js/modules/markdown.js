export function renderMarkdown(text) {
  if (!text) return '';
  
  let html = text;
  
  // Convert headings
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
  html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
  
  // Convert bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Convert code blocks
  html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre><code>${escapeHtml(p1.trim())}</code></pre>`;
  });
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
  
  // Convert lists
  html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gm, '<li>$2</li>');
  
  // Wrap lists in <ul> or <ol>
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  // Fix nested lists
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Convert images
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^___$/gm, '<hr>');
  
  // Convert paragraphs
  html = html.replace(/^(?!<[a-z])/gm, '<p>');
  html = html.replace(/^(.+)(?=<\/p>|<p>|$)/gm, '$1</p>');
  
  // Clean up empty paragraphs
  html = html.replace(/<p><\/p>/g, '');
  
  // Handle line breaks
  html = html.replace(/  \n/g, '<br>');
  
  return html;
}

// Escape HTML special characters for code blocks
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Add syntax highlighting (simplified version)
export function addSyntaxHighlighting() {
  const codeBlocks = document.querySelectorAll('pre code');
  
  codeBlocks.forEach(block => {
    // Add syntax highlighting classes
    // This is a simplified approach - in a real app,
    // you'd use a library like Prism.js or highlight.js
    
    // Highlight JavaScript
    if (block.classList.contains('language-js') || 
        block.classList.contains('language-javascript')) {
      const content = block.innerHTML;
      
      // Highlight keywords
      let highlighted = content.replace(
        /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|this)\b/g,
        '<span class="keyword">$1</span>'
      );
      
      // Highlight strings
      highlighted = highlighted.replace(
        /(["'`])(.*?)\1/g,
        '<span class="string">$1$2$1</span>'
      );
      
      // Highlight comments
      highlighted = highlighted.replace(
        /(\/\/.*)/g,
        '<span class="comment">$1</span>'
      );
      
      block.innerHTML = highlighted;
    }
  });
}
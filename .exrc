let g:vigun_mappings = [
      \ {
      \   'pattern': '\.test\.mjs$',
      \   'all': 'node --test #{file}',
      \   'nearest': 'node --test --test-name-pattern="#{nearest_test}" #{file}',
      \ },
      \]

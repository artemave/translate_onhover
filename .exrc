lua << EOF
local node_test = 'node --import ./test-support/register-hooks.mjs --test'

local function prefix(file)
  if file:match('^test/browser/') then
    return 'yarn -s webpack --config test/browser/support/webpack.config.js && ' .. node_test
  elseif file:match('^test/e2e/') then
    return 'MANIFEST_V3=true yarn -s webpack && ' .. node_test
  elseif file:match('^test/e2e%-mv2/') then
    return 'MANIFEST_V3=false GECKO_ID=transover-e2e@test yarn -s webpack && ' .. node_test
  end
  return node_test
end

-- --test-name-pattern is a regex
local function name_pattern(title)
  return vim.fn.shellescape('^' .. title:gsub('[%^%$%(%)%%%.%[%]%*%+%-%?%{%}|\\/]', '\\%0') .. '$')
end

require('vigun').setup({
  executor = 'hop',
  runners = {
    transover = {
      enabled = function()
        return vim.fn.expand('%'):match('%.test%.mjs$') ~= nil
      end,
      test_nodes = { 'it' },
      context_nodes = { 'describe' },
      commands = {
        all = function(_)
          local file = vim.fn.expand('%')
          return prefix(file) .. ' ' .. file
        end,
        nearest = function(info)
          local file = vim.fn.expand('%')
          return prefix(file) .. ' --test-name-pattern=' .. name_pattern(info.test_title) .. ' ' .. file
        end,
        ['debug-nearest'] = function(info)
          local file = vim.fn.expand('%')
          return prefix(file):gsub('node ', 'node --inspect-brk ', 1) .. ' --test-name-pattern=' .. name_pattern(info.test_title) .. ' ' .. file
        end,
      },
    },
  },
})
EOF

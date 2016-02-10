# A sample Guardfile
# More info at https://github.com/guard/guard#readme

guard :shell do
  watch /(?<!node_modules|bower_components).*(js|css|html|json)$/ do
    `open -g http://reload.extensions`
  end
end

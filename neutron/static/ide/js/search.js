var Search = require('ace/search').Search;
var Range = require("ace/range").Range;

function search_ui (toggle) {
  if (toggle == 'replace') {
    $("#replace_term").removeAttr("disabled");
  }
  
  if (toggle == 'search') {
    $("#replace_term").attr("disabled", "disabled");
  }
  
  if (toggle == 'sin_current' || toggle == 'sin_all') {
    $("#dirchooser").css("display", "none");
  }
  
  if (toggle == 'sin_current') {
    $("#search_select, #search_wrap, #search_back").removeAttr("disabled");
  }
  
  if (toggle == 'sin_all' || toggle == 'sin_dir') {
    $("#search_select, #search_wrap, #search_back").attr("disabled", "disabled");
  }
  
  if (toggle == 'sin_dir') {
    $("#dirchooser").css("display", "block");
  }
  
  if (toggle == 'prev_next') {
    $("#next_prev").css("display", "block");
  }
  
  if (toggle == 'replace_next') {
    $("#replace_next").css("display", "block");
  }
  
  if (toggle == 'replace_all_tabs') {
    $("#replace_all_tabs").css("display", "block");
  }
  
  if (toggle == 'replace_next' || toggle == 'prev_next' || toggle == 'replace_all_tabs') {
    $("#search_submit").css("display", "none");
    $("input[type='text'], input[type='checkbox'], input[type='radio']").attr('disabled', 'disabled');
  }
  
  if (toggle == 'new_search') {
    $("#next_prev").css("display", "none");
    $("#replace_next").css("display", "none");
    $("#replace_all_tabs").css("display", "none");
    
    $("#search_submit").css("display", "block");
    $("input[type='text'], input[type='checkbox'], input[type='radio']").removeAttr('disabled');
    
    var stype = $("input[name='stype']:checked").val();
    search_ui(stype);
  }
}

var current_search;
var current_replace;
var current_range;
var current_backwards;
var search_options;

function do_search () {
  var needle = $("#search_term").val();
  current_replace = $("#replace_term").val();
  
  if (needle == '') {
    alert('If I search for nothing I may find the end of a black hole and kill us all.');
  }
  
  else {
    var sin = $("input[name='sin']:checked").val();
    var stype = $("input[name='stype']:checked").val();
    
    search_options = {
      wrap: false,
      back: false,
      sensitive: false,
      whole: false,
      regex: false
    }
    
    for (var key in search_options) {
      if (document.getElementById('search_' + key).checked) {
        search_options[key] = true;
      }
    }
    
    search_options['needle'] = needle;
    
    if (sin == 'current') {
      current_search = false;
      if (stype == 'replace') {
        search_ui('replace_next');
      }
      
      else {
        search_ui('prev_next');
      }
      
      current_range = false;
      current_backwards = search_options['back'];
      
      search_next('forward');
    }
    
    else if (sin == 'all') {
      var opts = {
        needle: search_options['needle'],
        backwards: false,
        wrap: true,
        caseSensitive: search_options['sensitive'],
        wholeWord: search_options['whole'],
        scope: Search.ALL,
        regExp: search_options['regex']
      }
      
      current_search = new Search().set(opts);
      
      var html = '<div class="title"><em>All Tabs</em><strong>Search For: ' + search_options['needle'] + '</strong></div>';
      html += '<table>';
      html += '<tr><td><strong>Filename</strong></td><td><strong>Matches</strong></td></tr>';
      
      var item = $("#search_panel_replace");
      search_panel.select(item);
      search_panel.expand(item);
      
      for (dp in tab_paths) {
        var ranges = current_search.findAll(tab_paths[dp].session);
        if (ranges.length > 0) {
          var fn = dp.replace(basedir + "/", "");
          
          lines = '<div class="lines" id="line_results_' + tab_paths[dp].uid + '" style="display: none;">';
          for (var i=0; i < ranges.length; i++) {
            var row = ranges[i].start.row + 1;
            var col = ranges[i].start.column + 1;
            lines += '<a href="javascript: void(0)" onclick="go_to_line(\'' + escape(dp) + '\', ' + ranges[i].start.row + ', ' + ranges[i].start.column + ', ' + ranges[i].end.row + ', ' + ranges[i].end.column + ')">Line ' + row + ', Column ' + col + '</a>';
          }
          
          lines += '</div>';
          html += '<tr>';
          html += '<td><a class="expand" href="javascript: void(0)" onclick="show_line_results(\'' + tab_paths[dp].uid + '\')">' + fn +'</a>' + lines + '</td><td>' + ranges.length + '</td>';
          html += '</tr>';
        }
      }
      
      html += '</table>';
      $("#search_panel_results").html(html);
      
      size_search();
      current_range = false;
      
      if (stype == 'replace') {
        search_ui('replace_all_tabs');
      }
    }
  }
  
  return false;
}

function go_to_line (dp, y1, x1, y2, x2) {
  dp = unescape(dp);
  var range = new Range(y1, x1, y2, x2);
  
  if (dp in tab_paths) {
    $tabs.tabs('select', "#tabs-" + tab_paths[dp].tab);
    var sess = editor_global.getSession();
    current_search.findAll(sess);
    sess.getSelection().setSelectionRange(range, false);
  }
  
  else {
    get_file(dp, range);
  }
}

function show_line_results (uid) {
  var div = document.getElementById('line_results_' + uid);
  if (div.style.display == 'none') {
    div.style.display = 'block';
  }
  
  else {
    div.style.display = 'none';
  }
}

function replace_next () {
  if (current_range) {
    var sess = editor_global.getSession();
    var input = sess.getTextRange(current_range);
    var replacement = current_search.replace(input, current_replace);
    if (replacement !== null) {
      current_range.end = sess.replace(current_range, replacement);
    }
  }
  
  search_next('forward');
}

function replace_all (sess) {
  if (!sess) {
    sess = editor_global.getSession();
  }
  
  if (current_range) {
    var y = current_range.end.row + 1;
    var x = current_range.start.column;
    editor_global.gotoLine(y, x);
  }
  
  var ranges = current_search.findAll(sess);
  
  if (!ranges.length)
    return;
    
  var selection = editor_global.getSelectionRange();
  editor_global.clearSelection();
  editor_global.selection.moveCursorTo(0, 0);

  editor_global.$blockScrolling += 1;
  for (var i = ranges.length - 1; i >= 0; --i) {
    var input = sess.getTextRange(ranges[i]);
    var replacement = current_search.replace(input, current_replace);
    if (replacement !== null) {
      sess.replace(ranges[i], replacement);
    }
  }
    
  //editor_global.selection.setSelectionRange(selection);
  editor_global.$blockScrolling -= 1;
}

function replace_all_tab () {
  for (dp in tab_paths) {
    replace_all(tab_paths[dp].session);
  }
}

function search_next (way) {
  var back = false;
  
  if (current_range) {
    var y = current_range.end.row + 1;
    var x = current_range.end.column;
    
    if ((current_backwards && way == 'forward') || (!current_backwards && way == 'back')) {
      x = current_range.end.column - 1;
    }
    
    editor_global.gotoLine(y, x);
  }
  
  if ((current_backwards && way == 'forward') || (!current_backwards && way == 'back')) {
    back = true;
  }
  
  var opts = {
    needle: search_options['needle'],
    backwards: back,
    wrap: search_options['wrap'],
    caseSensitive: search_options['sensitive'],
    wholeWord: search_options['whole'],
    scope: Search.ALL,
    regExp: search_options['regex']
  }
  
  if (current_search) {
    current_search.set(opts);
  }
  
  else {
    current_search = new Search().set(opts);
  }
  
  current_range = current_search.find(editor_global.getSession());
  if (current_range) {
    editor_global.getSession().getSelection().setSelectionRange(current_range, false);
  }
  
  else {
    alert("The search of a thousand miles has completed. Good Job! You Rock!");
  }
}

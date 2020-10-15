
var chartWidth = 1000, chartHeight = 500, barPadding = 5;
var data;
var selectedOption;
var machines = [];
var uniquejobs = [1];

//Draw Gantt Chart
function drawDiagram(diadata) {
  data = diadata.jobs;
  machines = diadata.machines;
  console.log(machines);
  checkUniqueJob(uniquejobs);
  console.log(uniquejobs);
  var colors = d3.scaleLinear()
    .domain([0, uniquejobs.length])
    .range(["#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00","#cab2d6","#6a3d9a","#ffff99","#b15928",
    "#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5","#d9d9d9","#bc80bd","#ccebc5","#ffed6f"])
  var redgreen = ["red", "green"];

  var tardinesscount = 0;
  var tardinesssum = 0;
  var tardinessmax = 0;

  var opacityID = 0;

  var barHeight = 25
  var margin = ({ top: 30, right: 20, bottom: 10, left: 30 })

  var height = Math.ceil((data.length + 0.1) * barHeight) + margin.top + margin.bottom
  var width = 1000

  var svg = d3.select("svg")
    .attr("width", "2000px")
    .attr("height", chartHeight + "px")
    .style("display", "block")

  var x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.to)])
    .range([margin.left, width - margin.right])

  var y = d3.scaleBand()
    .domain(d3.range(machines.length))
    .rangeRound([margin.top, height - margin.bottom])
    .padding(0.3)

  var format = x.tickFormat(5, data.format)

  xAxis = g => g
    .attr("transform", `translate(0,${margin.top + 50})`)
    .call(d3.axisTop(x).ticks(width / 80, data.format))
    .call(g => g.select(".domain").remove())

  yAxis = g => g
    .attr("transform", `translate(${margin.left},50)`)
    .call(d3.axisLeft(y).tickFormat(i => machines[i].machine).tickSizeOuter(0))

    //Grey rect, when machine is not working
    / svg.append("defs")
      .append("pattern")
      .attr("width", d3.max(data, d => x(d.to)))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("y", 0)
      .attr("id", "bg")
      .append("image")
      .attr("width", d3.max(data, d => x(d.to)))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("y", 0)
      .attr("xlink:href", "zebra.png");

  var backrect = svg.append("g")
    .attr("fill", "grey"/*function (d) {
      return "url(#bg)";
    }*/)
    .selectAll("rect")
    .data(data)
    .join("rect")
    //.attr("stroke",function(d){return 'black';})
    .attr("x", (d) => x(0))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d3.max(data, d => x(d.to)))
    .attr("height", y.bandwidth())

  //Different colored rects, when machine is working
  var rects = svg.append("g")
    .attr("fill", "red")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.from))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d => x(d.to) - x(d.from))
    .attr("height", y.bandwidth())
    .attr("id", (d) => d.opnumber + "rectID" + d.job)
    .attr("fill", function (d) { return d3.rgb(colors(d.job)) })
    /*.style("opacity",function(d){
        if(opacityID == d.job ){
          return "1.0";
        }
        else  return "0.1";
    })*/
    .on("mouseover", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      console.log(x(e.to));
      if (document.getElementById("myCheck").checked == false) {
        tooltipdiv.style.opacity = 0.9;
        tooltipdiv.innerHTML = "Duration: " + (e.to - e.from) + "<br> Due date: " + e.duedate;
        tooltipdiv.style.left = x(e.from) + 10 + "px";
        tooltipdiv.style.top = y(getMachineIndex(e)) + 180 + "px";
        tooltipdiv.style.display = "block";
      }
      else {
        tooltipdiv.style.opacity = 0;
      }
    }).on("mouseout", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      tooltipdiv.style.display = "none";
    })
    .on("click", function (e) {
      for (let index = 0; index < data.length; index++) {
        var currentrect = document.getElementById(data[i].opnumber + "rectID" + data[i].job)
        if (data[i].job != e.job) {
          currentrect.style.opacity = 0.4;
        }
        else {
          currentrect.style.opacity = 1.0;
        }

      }

    })

  //Append innerrect, green or red, the job is in time or not
  var innerrects = svg.append("g")
    .attr("fill", "black")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.from) + 5)
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 55)
    .attr("width", d => x(d.to) - x(d.from) - 12)
    .attr("height", y.bandwidth() - 12)
    .attr("id",(d) => d.opID + "innerrect" )
    .attr("fill", function (d) {
      if (d.to <= d.duedate) {
        return "green";
      }
      else {
        tardinesscount += 1;
        tardinesssum += (d.to - d.duedate);
        tardinessmax = d3.max(data, d => (d.to - d.duedate));
        return "red"
      }
    })
    .attr("opacity",0.01);

  //Information text on the operation
  svg.append("g")
    .attr("fill", "black")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .selectAll("text")
    .data(data)
    .join("text")
    //.attr("x", d => (x(d.to) + x(d.from)) / 2)
    .attr("x", d => (x(d.to)- 5) )
    .attr("y", (d) => y(getMachineIndex(d) - 1) + margin.top + y.bandwidth())
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .attr("id",(d) => d.opID + "innerrecttext" )
    .text(function (d) {
      var val0 = tardinessmax;
      var val = d.job;
      var val2 = d.opnumber;
      var val3 = d.duedate;
      var v = "Job " + val + " Op " + val2 ;

      return v;
    })


  svg.append("g")
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  var title = svg
    .append("text")
    .text("Gantt Chart")
    .attr("x", chartWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", 32)
    .attr("fill", "#FFF");

  //Turn off tooltip function
  var checkbox = document.createElement('input');
  checkbox.setAttribute("type", "checkbox");
  checkbox.value = 1;
  //checkbox.style.position = "absolute";
  checkbox.id = "myCheck";

  var checkboxtext = document.createElement('div');
  checkboxtext.id = "checkboxText"
  checkboxtext.innerHTML = "Tooltip turn off  ";

  document.getElementById('chartDiv').prepend(checkboxtext);
  document.getElementById("checkboxText").append(checkbox);

  //Draw KPI tables
  Criterion();
  Occupancy();
  DueDate();

}

function getMachineIndex(d) {
  for (i in machines) {
    for (j in machines[i].jobsOnMachine) {
      if (d.opID == machines[i].jobsOnMachine[j]) {
        return machines[i].id;
      }
    }
  }
}

//Unique jobs selection
function checkUniqueJob(jobs) {
  for (let i = 0; i < data.length; i++) {
    var count = 0;
    for (let j = 0; j < jobs.length; j++) {
      if (data[i].job === jobs[j]) {
        count++;
      }
    }
    if (count === 0) {
      jobs.push(data[i].job);
    }
  }
}

//Load .json
function loadFile() {
  var input, file, fr;

  if (typeof window.FileReader !== "function") {
    alert("The file API isn't supported on this browser yet.");
    return;
  }

  input = document.getElementById("fileinput");
  if (!input) {
    alert("Um, couldn't find the fileinput element.");
  } else if (!input.files) {
    alert(
      "This browser doesn't seem to support the `files` property of file inputs."
    );
  } else if (!input.files[0]) {
    alert("Please select a file before clicking 'Load'");
  } else {
    var label = document.getElementById("inputfile_name");
    file = input.files[0];
    label.innerHTML = file.name;
    console.log(file);
    fr = new FileReader();
    fr.readAsText(file);
    fr.onload = receivedText;

  }
}

var chooseBtn = document.getElementById("fileinput");
var label = document.getElementById("inputfile_name");
var labelvalue = label.innerHTML;
chooseBtn.addEventListener('change', function (e) {
  let filename = '';
  filename = e.target.value.split('\\').pop();
  if (filename) {
    label.innerHTML = filename;
  }
  else {
    label.innerHTML = labelvalue;
  }
});

function receivedText(e) {
  let lines = e.target.result;
  data = JSON.parse(lines);
  drawDiagram(data);
}


function Criterion() {
  var criterionOptions = ["Cmax", "ΣCi", "Lmax", "Tmax"];
  /*if (document.getElementById("mySelect") === null) {
    var selectList = document.createElement("select");
    selectList.id = "mySelect";
    document.body.appendChild(selectList);

    for (var i = 0; i < criteriaList.length; i++) {
      var option = document.createElement("option");
      option.value = criteriaList[i];
      option.text = criteriaList[i];
      selectList.appendChild(option);
    }
    selectList.addEventListener('change', function (e) {
      selectedOption = selectList.options[selectList.selectedIndex].text;
      console.log(selectedOption);
      createCrTable(selectedOption);
    })
  }*/
  for (let i = 0; i < criterionOptions.length; i++) {
    createCrTable(criterionOptions[i]);

  }
}

function createCrTable(selectedOption) {

  var div = document.getElementsByName('optimality')[0];
  var tbl = document.createElement('table');
  tbl.className = "crtable"
  tbl.style = "table";
  tbl.style.width = '80%';

  var tbdy = document.createElement('tbody');

  switch (selectedOption) {
    case "Cmax":
      var tr = document.createElement('tr');
      for (let index = 0; index < 3; index++) {
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        const max = d3.max(data, function (d) {
          return d.to;
        });
        if (index == 0) td.innerHTML = "Cmax";
        else if (index == 1) {
          for (let i = 0; i < data.length; i++) {
            if (data[i].to == max) {
              td.innerHTML = data[i].to;
            }
          }
        }
        else td.innerHTML = max;
        console.log(td.innerHTML);
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
      console.log(tbdy.innerHTML);
      break;
    case "ΣCi":
      var sum = 0;
      for (let index = 0; index < data.length; index++) {
        sum += (data[index].to - data[index].from);
      }

      var tr = document.createElement('tr');
      for (let index = 0; index < 2; index++) {
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        if (index == 0) {
          td.innerHTML = "ΣCi";
        }
        else td.innerHTML = sum;
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
      break;

    case "Lmax":
      
      for (let index = 0; index < uniquejobs.length; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0) {
            //td.innerHTML = uniquejobs[index];
            td.innerHTML = "Job " + uniquejobs[index] ;
          }
          else {
            let tempjobs = [];
            data.forEach(element => {
              if (element.job == uniquejobs[index]) {
                tempjobs.push(element);
              }
            });
            td.innerHTML = ((d3.max(tempjobs, function (d) {
              return d.to;
            })) - tempjobs[0].duedate);

            console.log("max" +(d3.max(tempjobs, function (d) {
              return d.to;
            })));

            console.log(tempjobs);
            console.log("due"+tempjobs[0].duedate);
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }

      break;
    case "Tmax":

      for (let index = 0; index < uniquejobs.length; index++) {
        tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
         /* if(i==0 && j==0){
            td.columnSpan = 1;
          }*/
          if (j == 0 && i!=0) {
            td.innerHTML = "Job " + uniquejobs[index] ;
          }
          else {
            let tempjobs = [];
            data.forEach(element => {
              if (element.job == uniquejobs[index]) {
                tempjobs.push(element);
              }
            });
            if (((d3.max(tempjobs, function (d) {
              return d.to;
            })) - tempjobs[0].duedate) < 0) {
              td.innerHTML = 0;
            }
            else {
            }
            td.innerHTML = (d3.max(tempjobs, function (d) {
              return d.to;
            })) - tempjobs[0].duedate;
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      break;
  }
  div.appendChild(tbl);

}

function Occupancy() {
  machineUtilization();
 // removeCrElements();
  var div = document.getElementsByName('occupancy')[0];
  var tbl = document.createElement('table');
  tbl.style = "table";
  tbl.id = "octable";
  tbl.style.width = '80%';

  var tbdy = document.createElement('tbody');
  const max = d3.max(data, function (d) {
    return d.to;
  });
  var c = -1;
  for (let i = 0; i < machines.length + 1; i++) {

    var tr = document.createElement('tr');

    for (let j = 0; j < 2; j++) {
      var td = document.createElement('td');
      td.appendChild(document.createTextNode('\u0020'))

      if (i == 0 && j == 0) td.innerHTML = "Üzemkihasználtság:";
      if (i == 0 && j == 1) {

        td.innerHTML = "Üzemkihasználtság:";
      }
      if (i != 0 && j == 0) {
        c++;
        td.innerHTML = machines[c].machine;
      }
      if (i != 0 && j == 1) {


        td.innerHTML = "igen";
      }
      tr.appendChild(td);
    }
    tbl.appendChild(tr);
  }
  div.appendChild(tbl);
}

//Delete elment 
function removeCrElements() {
  var elem = document.getElementsByClassName("crtable");
  console.log(elem);

  for (let index = elem.length - 1; index >= 0; index--) {
    elem[index].remove();
  }

  var selelem = document.getElementById("mySelect");
  selelem.remove();
}

function DueDate() {
  var div = document.getElementsByName('due')[0];
  var tbl = document.createElement('table');
  tbl.className = "crtable"
  tbl.style = "table";
  tbl.style.width = '40%';
  for (let index = 0; index < uniquejobs.length; index++) {
    var tr = document.createElement('tr');
    for (let j = 0; j < 2; j++) {
      var td = document.createElement('td');
      td.appendChild(document.createTextNode('\u0020'))
      if (j == 0) {
        //td.innerHTML = uniquejobs[index];
        td.innerHTML = " job" + uniquejobs[index];
      }
      else {
        data.forEach(element => {
          if (element.job == uniquejobs[index]) {
            td.innerHTML = element.duedate;
          }
        });
      }
      tr.appendChild(td)
    }
    tbl.appendChild(tr);

  }
  div.appendChild(tbl);

}

function machineUtilization() {
  /*  let da = 0;
    for (let m = 0; m < machines.length; m++) {
      var tempsum = 0;
      for (let mo = 0; mo < machines[m].jobsOnMachine; mo++) {
        for (da = 0; da < data.length; da++) {
          if (data[da].opID == machine[m].jobsOnMachine[mo]) {
            tempsum += (data[d].to - data[d].from);
            console.log(tempsum);
          }
  
        }
      }
      console.log("asdfghjk" + tempsum);
    }
  */


  //Setup idők összege, maximuma
  var setupsum = 0;
  var maxsetup = 0;
  var setupcount = 0;
  for (let index = 0; index < data.length; index++) {
    setupsum += data[index].setup;
    maxsetup = d3.max(data, d => (d.setup))
    if (data[index].setup > 0) {
      setupcount += 1;
    }
  }

  //Várakozás idők gépenként
  for (let j = 0; j < machines.length; j++) {
    wait = d3.max(data, d => (d.to));
    for (let i = 0; i < data.length; i++) {
      for (let k = 0; k < machines[j].jobsOnMachine.length; k++) {
        if (data[i].opID == machines[j].jobsOnMachine[k]) {
          wait -= (data[i].to - data[i].from);

        }
      }
    }
  }

  //Rendszer terheltsége
  var operationsum = 0;
  for (let i = 0; i < data.length; i++) {
    operationsum += 1;
  }

  //Jobok átfutási ideje
  var jobleadtime;
  for (let i = 0; i < uniquejobs.length; i++) {
    jobleadtime = 0;
    for (let j = 0; j < data.length; j++) {
      if (data[j] == uniquejobs[i]) {
        jobleadtime += (data[j].to - data[j].from);
      }
    }
    console.log(jobleadtime);
  }
}

//KPI tabpanel
function openTab(evt, id) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(id).style.display = "block";
  evt.currentTarget.className += " active";
}

//Show red-green innerrects in the chart
function showDueDate(){
  for (let i = 0; i < data.length; i++) {
    var currentinnerrect = document.getElementById(data[i].opID+"innerrect");
    currentinnerrect.style.opacity = 1.0;

  }
}
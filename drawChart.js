//Változók deklarálása:
var chartWidth = 1000, chartHeight = 500, barPadding = 5;
var data;
var machines = [];
var uniquejobs = [1];

//Kihasználtság
var utilization = 0; //Rendszer kihasználtsága, összesen mennyit ment, a kapacitáshoz képest
var utilizationmachine = []; //Gépenkénti kihasználtság (mennyit ment a gép)


//Terhelés
var operationsum = 0;
var operationsummachine = []; //Legelső eleme az összes operation, a többi gépenkénti operation szám

//Határidő
var showDueChecked = 0;
var jobintime = [];

//Setup idők összege, maximuma, darabszáma
var setupsum = 0;
var maxsetup = 0;
var setupcount = 0;


//Várakozás
var waitarray = [];

//Csúszás
var tardinesscount = 0;
var tardinesssum = 0;
var tardinessmax = 0;
var tardinessavg = 0;

//Koraiság
var earlinesscount = 0;
var earlinesssum = 0;
var earlinessavg = 0;

//Legkésőbbi operáció végének időpontja
const max;

//Jobok átfutási ideje
//Gyártási átfutási idő - jobonként
let jobleadtime = [];
//Termelési átfutási idő - jobonként
let jobltwithsetup = [];

//Gantt diagram kirajzolása
function drawDiagram(diadata) {
  data = diadata.operations;
  machines = diadata.machines;
  checkUniqueJob(uniquejobs);
  var colors = d3.scaleLinear()
    .domain([0, uniquejobs.length])
    .range(["#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928",
      "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"])

  var barHeight = 25
  var margin = ({ top: 30, right: 20, bottom: 10, left: 30 })

  var height = Math.ceil((data.length + 0.1) * barHeight) + margin.top + margin.bottom
  var width = d3.max(data, d => d.to) + 1200

  var svg = d3.select("svg")
    .attr("width", d3.max(data, d => d.to) + 1200)
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
  svg.append("defs")
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
    .on("mouseover", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      if (document.getElementById("myCheck").checked == false) {
        tooltipdiv.style.opacity = 0.9;
        tooltipdiv.innerHTML = "Setup time:" + e.setup + "<br> Duration: " + (e.to - e.from) + "<br> Due date: " + e.duedate + "<br> Prority:" + e.priority;
        tooltipdiv.style.left = x(e.from) + 10 + "px";
        tooltipdiv.style.top = y(getMachineIndex(e) - 1) + 170 + "px";
        tooltipdiv.style.display = "inline";
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
        var currentrect = document.getElementById(data[index].opnumber + "rectID" + data[index].job)
        if (data[index].job != e.job) {
          currentrect.style.opacity = 0.4;
        }
        else {
          currentrect.style.opacity = 1.0;
        }
      }
    })

  //Append innerrect, green or red, the job is in time or not
  const max = d3.max(data, function (d) {
    return d.to;
  });
  var innerrects = svg.append("g")
    .attr("fill", "black")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.from) + 5)
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 55)
    .attr("width", d => x(d.to) - x(d.from) - 12)
    .attr("height", y.bandwidth() - 12)
    .attr("id", (d) => d.opID + "innerrect")
    .attr("fill", function (d) {
      if (d.to <= d.duedate) {
        return "green";
      }
      else {
        /*tardinesscount += 1;
        tardinesssum += (d.to - d.duedate);
        tardinessmax = d3.max(data, d => (d.to - d.duedate));*/
        return "red"
      }
    })
    .attr("opacity", 0.01)
    .attr("display", d => (((d.to - d.from) / max) < 0.01) ? "none" : "block")
    .on("mouseover", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      if (document.getElementById("myCheck").checked == false) {
        tooltipdiv.style.opacity = 0.9;
        tooltipdiv.innerHTML = "Setup time:" + e.setup + "<br> Duration: " + (e.to - e.from) + "<br> Due date: " + e.duedate + "<br> Prority:" + e.priority;
        tooltipdiv.style.left = x(e.from) + 10 + "px";
        tooltipdiv.style.top = y(getMachineIndex(e)) + 170 + "px";
        tooltipdiv.style.display = "block";
      }
      else {
        tooltipdiv.style.opacity = 0;
      }
    }).on("mouseout", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      tooltipdiv.style.display = "none";
    });


  //Append setuprects
  var setuprect = svg.append("g")
    .attr("fill", "#424647")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.from) - d.setup)
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d => d.setup)
    .attr("height", y.bandwidth())
    .attr("id", (d) => d.opID + "setup")


  //Information text on the operation
  svg.append("g")
    .attr("fill", "black")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", d => (x(d.to) - 5))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + margin.top + y.bandwidth())
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .attr("id", (d) => d.opID + "innerrecttext")
    .text(function (d) {
      var v = "Job " + d.job + " Op " + d.opnumber;
      return v;
    })
    .attr("display", d => (((d.to - d.from) / max) < 0.1) ? "none" : "block");

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
  if (document.contains(document.getElementById("myCheck"))) { }
  else {
    var checkbox = document.createElement('input');
    checkbox.setAttribute("type", "checkbox");
    //checkbox.id = "checkbox";
    checkbox.value = 1;
    checkbox.id = "myCheck";

    var checkboxtext = document.createElement('div');
    checkboxtext.id = "checkboxText"
    checkboxtext.innerHTML = "Tooltip turn off  ";

    document.getElementById('chartDiv').prepend(checkboxtext);
    document.getElementById("checkboxText").append(checkbox);
  }
  //Draw KPI tables
  Criterion();
  CalculationKPI("jobleadtime");
  CalculationKPI("setups");
  CalculationKPI("allocation");
  CalculationKPI("waiting");
  DueDate(tardinesscount, tardinessmax, tardinesssum);
  Occupancy();
  drawList(data);
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

function drawList(data) {
  var divv = document.getElementById('list');
  var tbl = document.createElement('table');
  var tdd;
  tbl.style = "table";
  tbl.style.width = '70%';
  for (let i = 0; i < data.length; i++) {
    var tr = document.createElement('tr');
    for (let j = 0; j < data[i].length; j++) {
      tdd = document.createElement('td');
      tdd.appendChild(document.createTextNode('\u0020'))
      tdd.innerHTML = "asd";
      tr.appendChild(tdd);
    }
    tbl.appendChild(tr);
  }
  divv.appendChild(tbl);
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
  tbl.style.width = '50%';

  var labell = document.createElement('label');
  switch (selectedOption) {
    case "Cmax":
      labell.innerHTML = "End of the last operation";
      var tr = document.createElement('tr');
      for (let index = 0; index < 3; index++) {
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        max = d3.max(data, function (d) {
          return d.to;
        });
        if (index == 0) td.innerHTML = "Cmax";
        else if (index == 1) {
          for (let i = 0; i < data.length; i++) {
            if (data[i].to == max) {
              td.innerHTML = "End on " + getMachineIndex(data[i]) + "machine";
            }
          }
        }
        else td.innerHTML = max;
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
      break;

    case "ΣCi":
      labell.innerHTML = "Time of execution of operations";
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
      labell.innerHTML = "Number of lateness per job";
      for (let index = 0; index < uniquejobs.length; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0) {
            td.innerHTML = "Job " + uniquejobs[index];
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
            })) - d3.max(tempjobs, d => d.duedate));
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      break;

    case "Tmax":
      labell.innerHTML = "Number of tardiness per job";
      for (let index = 0; index < uniquejobs.length; index++) {
        tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && i != 0) {
            td.innerHTML = "Job " + uniquejobs[index];
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
            })) - d3.max(tempjobs, d => d.duedate)) < 0) {
              td.innerHTML = 0;
            }
            else {
              td.innerHTML = (d3.max(tempjobs, function (d) {
                return d.to;
              })) - d3.max(tempjobs, d => d.duedate);
            }
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      break;
  }
  div.appendChild(labell);
  div.appendChild(tbl);
}

//Kihasználtság (rendszer, gépenként %-ban)
function Occupancy() {
  var div = document.getElementsByName('occupancy')[0];
  var tbl = document.createElement('table');
  tbl.style = "table";
  tbl.id = "octable";
  tbl.style.width = '50%';

  var c = -1; //segédváltozó indexeléshez
  for (let i = 0; i < machines.length + 1; i++) {
    var tr = document.createElement('tr');
    for (let j = 0; j < 2; j++) {
      var td = document.createElement('td');
      td.appendChild(document.createTextNode('\u0020'))

      if (i == 0 && j == 0) td.innerHTML = "Utilization:";
      if (i == 0 && j == 1) td.innerHTML = Math.round((utilization / (machines.length * d3.max(data, d => (d.to)))) * 100, 1) + "%";
      if (i != 0 && j == 0) {
        c++;
        td.innerHTML = machines[c].machine;
      }
      if (i != 0 && j == 1) {
        td.innerHTML = Math.round((utilizationmachine[i] / max) * 100, 1) + "%";
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
  for (let index = elem.length - 1; index >= 0; index--) {
    elem[index].remove();
  }
  var selelem = document.getElementById("mySelect");
  selelem.remove();
}

//Határidő
function DueDate() {
  jobintime.push(tardinesscount); //késő munkák száma
  jobintime.push(uniquejobs.length - tardinesscount); //időben lévők száma

  var div = document.getElementsByName('due')[0];
  var tbl = document.createElement('table');
  tbl.className = "duetable"
  tbl.style = "table";
  tbl.style.width = '50%';
  var buttondue = document.createElement('button');
  buttondue.innerHTML = "Representation on a chart"
  buttondue.onclick = function () {
    drawPieDiagram(jobintime, "due");
  }

  for (let i = 0; i < 3; i++) {
    if (i == 0) {//Jobonkénti határidő
      for (let index = 0; index < uniquejobs.length; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0) {
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
      div.appendChild(buttondue);
    }
    if (i == 1) { //Csúszások mutatója
      for (let index = 0; index < 4; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && index == 0) td.innerHTML = "Number of delays";
          if (j == 0 && index == 1) td.innerHTML = "Max of delays";
          if (j == 0 && index == 2) td.innerHTML = "Sum of delays";
          if (j == 0 && index == 3) td.innerHTML = "Average of delays";
          if (j == 1 && index == 0) td.innerHTML = tardinesscount;
          if (j == 1 && index == 1) {
            for (let k = 0; k < data.length; k++) {
              var tardinessmaxjob = 0;
              if ((data[k].to - data[k].duedate) == tardinessmax) {
                tardinessmaxjob = data[k].job;
              }
            }
            td.innerHTML = tardinessmax + " (Job " + tardinessmaxjob + ")";
          }
          if (j == 1 && index == 2) td.innerHTML = tardinesssum;
          if (j == 1 && index == 3) td.innerHTML = tardinessavg;
          tr.appendChild(td)
        }
        tbl.appendChild(tr);
      }
      div.appendChild(tbl);
    }
    else { //Siető munkák mutatója
      for (let index = 0; index < 3; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && index == 0) td.innerHTML = "Number of earliness";
          if (j == 0 && index == 1) td.innerHTML = "Sum of delays";
          if (j == 0 && index == 2) td.innerHTML = "Average of delays";
          if (j == 1 && index == 0) td.innerHTML = earlinesscount;
          if (j == 1 && index == 1) td.innerHTML = earlinesssum;
          if (j == 1 && index == 2) td.innerHTML = earlinessavg;
          tr.appendChild(td)
        }
        tbl.appendChild(tr);
      }
      div.appendChild(tbl);
    }
  }
}

function CalculationKPI(sel) {
  //Befoglaló tábla
  var div = document.getElementsByName('kpi')[0];
  var tbl = document.createElement('table');
  tbl.style = "table";
  tbl.id = "kpitable";
  tbl.style.width = '50%';

  //SZÁMÍTÁSOK
  //Rendszer terheltsége
  for (let i = 0; i < data.length; i++) {
    console.log("Data" + data);
    operationsum += 1;
  }

  //Várakozás idők gépenként
  //Üzemkihasználtság gépenként
  //Terheltség gépenként
  utilization = (machines.length * d3.max(data, d => (d.to)))
  operationsummachine.push(operationsum);
  for (let j = 0; j < machines.length; j++) {
    wait = d3.max(data, d => (d.to));
    var operationsumpermachine = 0;
    for (let i = 0; i < data.length; i++) {
      for (let k = 0; k < machines[j].jobsOnMachine.length; k++) {
        if (data[i].opID == machines[j].jobsOnMachine[k]) {
          wait -= (data[i].to - data[i].from);
          operationsumpermachine += 1;
        }
      }
    }
    utilization -= wait; //Rendszer kihasználtság
    utilizationmachine.push(d3.max(data, d => (d.to)) - wait); // Gépenkénti kihasználtság (mennyit ment)
    operationsummachine.push(operationsumpermachine); //Gépenkénti terhelés(mennyi ment rajta)
    waitarray.push(wait); //Várakozási idő gépenként
  }

  //SZEPARÁLVA
  switch (sel) {
    case "jobleadtime":
      //Átfutási idők
      for (let i = 0; i < uniquejobs.length; i++) {
        //segédváltozók:
        var jobleadtimes = 0;
        var jobltwithsetups = 0;
        for (let j = 0; j < data.length; j++) {
          if (data[j].job == uniquejobs[i]) {
            jobleadtimes += (data[j].to - data[j].from);
            jobltwithsetups += (data[j].to - data[j].from) + data[j].setup;
          }
        }
        jobleadtime.push(jobleadtimes);
        jobltwithsetup.push(jobltwithsetups);
      }

      var labelleadtime = document.createElement('label');
      labelleadtime.innerHTML = "Lead time of jobs, without and with setup time";
      for (let i = 0; i < uniquejobs.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 3; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0) td.innerHTML = "Job " + uniquejobs[i];
          if (j == 1) td.innerHTML = jobleadtime[i];
          if (j == 2) td.innerHTML = jobltwithsetup[i];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelleadtime);
      break;

    case "setups":
      //Átállási idők
      for (let index = 0; index < data.length; index++) {
        setupsum += data[index].setup;
        maxsetup = d3.max(data, d => (d.setup))
        if (data[index].setup > 0) {
          setupcount += 1;
        }
      }
      var labelsetup = document.createElement('label');
      labelsetup.innerHTML = "Sum, max of setup times, number of setups";
      for (let i = 0; i < 3; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0 && i == 0) td.innerHTML = "Sum";
          if (j == 1 && i == 0) td.innerHTML = setupsum;
          if (j == 0 && i == 1) td.innerHTML = "Max";
          if (j == 1 && i == 1) td.innerHTML = maxsetup;
          if (j == 0 && i == 2) td.innerHTML = "Count";
          if (j == 1 && i == 2) td.innerHTML = setupcount;

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelsetup);
      break;

    case "allocation":
      //Terheltség
      var labeluti = document.createElement('label');
      labeluti.innerHTML = "System/ Machine allocation";
      var buttonuti = document.createElement('button');
      buttonuti.innerHTML = "Representation on a chart"
      buttonuti.onclick = function () {
        drawPieDiagram(operationsummachine, "kpi");
      }
      for (let i = 0; i < operationsummachine.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0 && i == 0) td.innerHTML = "System allocation rate";
          if (j == 1 && i == 0) td.innerHTML = operationsummachine[i];
          if (j == 0 && i != 0) td.innerHTML = machines[i - 1].machine;
          if (j == 1 && i != 0) td.innerHTML = operationsummachine[i];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labeluti);
      div.appendChild(buttonuti);
      break;

    case "waiting":
      //Várakozási idők
      var labelwait = document.createElement('label');
      labelwait.innerHTML = "The waiting of machines";
      var buttonwait = document.createElement('button');
      buttonwait.innerHTML = "Representation on a chart"
      buttonwait.onclick = function () {
        drawWaitBarDiagram();
      }
      for (let i = 0; i < machines.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0) td.innerHTML = machines[i].machine;
          if (j == 1) td.innerHTML = waitarray[i];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelwait);
      div.appendChild(buttonwait);
      break;
  }
  div.appendChild(tbl);
}

//KPI tabpanel
function openTab(evt, id, type) {
  var i, tabcontent, tablinks;
  if (type == "main") tabcontent = document.getElementsByClassName("tabcontent");
  else tabcontent = document.getElementsByClassName("maintabcontent");

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
function showDueDate() {
  showDueChecked += 1;
  for (let i = 0; i < data.length; i++) {
    var currentinnerrect = document.getElementById(data[i].opID + "innerrect");
    if (showDueChecked > 0 && showDueChecked % 2 == 0) {
      currentinnerrect.style.opacity = 0.0;
    }
    else currentinnerrect.style.opacity = 1.0;
  }
}

//Várakozás
function drawWaitBarDiagram() {
  width = 700;
  height = 500;

  margin = ({ top: 20, right: 0, bottom: 30, left: 40 })
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "50%")
    .attr("height", "50%")
  x = d3.scaleBand()
    .domain(machines.map(d => d.machine))
    .range([margin.left, width - margin.right])
    .padding(0.1)

  y = d3.scaleLinear()
    .domain([0, d3.max(waitarray, (d) => d)])
    .range([500 - margin.bottom, margin.top])

  const g = svg.append("g")
    .attr("class", "bars")
    .attr("fill", "red")
    .selectAll("rect")
    .data(waitarray)
    .join("rect")
    .attr("x", (d, i) => x(machines[i].machine) + 70)
    .attr("y", (d, i) => y(d))
    .attr("height", (d) => y(0) - y(d))
    .attr("width", x.bandwidth() - 50)
    .attr("transform",
      "translate(" + margin.left + "," + ")");

  xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))

  yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())

  svg.append("g")
    .attr("class", "x-axis")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);
  document.getElementById("kpi").appendChild(svg.node());
}

//Kördiagramok terheltségre, határidőre
function drawPieDiagram(piechartdata, location) {
  var width = 450
  height = 450
  margin = 40

  var radius = Math.min(width, height) / 2 - margin

  var svg = d3.select("#" + location)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var chartdata = piechartdata;
  chartdata.splice(0, 1);

  var color = d3.scaleOrdinal()
    .domain(chartdata)
    .range(d3.schemeSet2);

  var pie = d3.pie()
    .value(function (d) { return d.value; })
  var data_ready = pie(d3.entries(chartdata))

  var arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(radius)

  svg
    .selectAll('mySlices')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', arcGenerator)
    .attr('fill', function (d) { return (color(d.value + Math.random())) })
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7)
    .on("mouseover", function (e) {
      if (location == "kpi") {
        var tooltipslice = document.getElementById("tooltip");
        tooltipslice.style.opacity = 0.9;
        tooltipslice.innerHTML = machines[i].machine + " " + e.value + " op" + (e.value / chartdata0) * 100 + "%";
        tooltipslice.style.left = x(e.value) + 10 + "px";
        tooltipslice.style.top = y(e.value) + 170 + "px";
        tooltipslice.style.display = "inline";
        console.log(x(e.value) + 10);
        console.log(y(e.value) + 170);
      }
      if (location == "due") {
      }

    }).on("mouseout", function (e) {
      var tooltipslice = document.getElementById("tooltip");
      tooltipslice.style.display = "none";
    })

  svg
    .selectAll('mySlices')
    .data(data_ready)
    .enter()
    .append('text')
    .text(function (d, i) {
      if (location == "kpi") {
        return machines[i].machine + " " + d.value + " op"
      }
      else return d.value + " operation"
    })
    .attr("transform", function (d) { return "translate(" + arcGenerator.centroid(d) + ")"; })
    .attr("display", function () {
      if (chartdata.length > 10) return "none"
      else return "block"
    })
    .style("text-anchor", "middle")
    .style("font-size", 14)

  var buttonbar = document.createElement('button');
  buttonbar.innerHTML = "Change to bar chart"
  buttonbar.onclick = function () {
    svg.display = "none";
    if (location == "kpi") drawAllocationBarDiagram(piechartdata);
    // else drawDueBarDiagram();
  }
  var div = document.getElementsByName(location)[0];
  div.appendChild(buttonbar);
}

function drawAllocationBarDiagram(operationsummachine) {
  width = 700;
  height = 500;

  //Data
  var chartdata = operationsummachine;

  margin = ({ top: 20, right: 0, bottom: 30, left: 40 })
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "60%")
    .attr("height", "60%")
  //.attr("display","inline-block")

  x = d3.scaleBand()
    .domain(machines.map(d => d.machine))
    .range([margin.left, width - margin.right])
    .padding(0.1)

  y = d3.scaleLinear()
    .domain([0, d3.max(chartdata, (d) => d)])
    .range([height - margin.bottom, margin.top])

  const g = svg.append("g")
    .attr("class", "bars")
    .attr("fill", "red")
    .selectAll("rect")
    .data(chartdata)
    .join("rect")
    .attr("x", (d, i) => x(machines[i].machine))
    .attr("y", (d, i) => y(d))
    .attr("height", (d) => y(0) - y(d))
    .attr("width", x.bandwidth() - 50)
    .attr("transform",
      "translate(" + margin.left + "," + ")");

  xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0))

  yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())

  svg.append("g")
    .attr("class", "x-axis")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);
  document.getElementById("kpi").appendChild(svg.node());
}

function Határidő() {
  //késő munkák 
  var határidőtúllépéspermunka = [];
  var későmunkákszáma = 0;
  for (let i = 0; i < uniquejobs.length; i++) {
    seged = 0;
    for (let j = 0; j < data.length; j++) {
      if (data[j].job == uniquejobs[i]) {
        seged = d3.max(data, d => d.to) - d.duedate;
      }
    }
    határidőtúllépéspermunka.push(seged);

  }



}
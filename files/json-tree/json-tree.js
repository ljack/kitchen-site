
function expandParents(item) {
	var closestLi = item.parent().parents("li.collapsed").first();
	if(closestLi.length) {
		closestLi.removeClass("collapsed");

		var span = closestLi.find("span.fa").first();
		span.removeClass("fa-caret-right");
		span.addClass("fa-caret-down");

		var link = closestLi.find("a").first();
		expandParents(link);
	}
}

function selectInCodeMirror(searchPath) {

	if (!searchPath || !searchPath.length) {
		console.log("Nothing to search?");
		return;
	}
	searchPath = searchPath.reverse();
	console.log("searchPath=", searchPath);

	var cm = $("#json-editor").next(".CodeMirror");

	if (cm == null || cm[0] == null) {
		console.log("No CodeMirror found, but that's ok. ");
		return;
	}

	cm = cm[0].CodeMirror;

	var pos = 0;

	cm.eachLine(function f(line) {

		var index = line.text.indexOf('"'+searchPath[pos]+'"');
		if (index > -1) {
			pos++;
			if (pos === searchPath.length) {
				var lineNumber = cm.doc.getLineNumber(line);
				cm.doc.setSelection({
					line: lineNumber
				});
				cm.scrollIntoView({
					line: lineNumber
				}, 200);

				// cm.doc.markText( {line: lineNumber}, {line: lineNumber }, {clearOnEnter:true} );
				return true;
			}

		}

	});


}


function selectItem(link) {
	var li = link.parent();
	var container = link.closest("div");
	var span = link.find("span.fa").first();

	if(link.hasClass("collapsable-item") && li.hasClass("active")) {
		li.toggleClass("collapsed");

		if(li.hasClass("collapsed")) {
			span.removeClass("fa-caret-down");
			span.addClass("fa-caret-right");
		} else {
			span.removeClass("fa-caret-right");
			span.addClass("fa-caret-down");
		}
	} else {
		container.find("li.active").removeClass("active");
		li.addClass("active");
	}
	
	
	
	
}

function selectRequestedOrFirstItem() {
	// highlight object passed as param or first object found in tree
	if(Router.current() && Router.current().params) {
		var routeName = Router.current().route.getName();
		if(routeName != "PAGE_ROUTE_NAME") {
			return;
		}
		var objectId = Router.current().params.objectId || "";
		var propertyName = Router.current().params.propertyName || "";

		if(objectId == "null") objectId = "";
		if(propertyName == "null") propertyName = "";

		if(objectId) {
			var link = null;
			if(propertyName) {
				link = $(".object-tree-array[data-object-id='" + objectId + "'][data-property-name='" + propertyName + "']").first();
			} else {
				link = $(".object-tree-link[data-object-id='" + objectId + "']").first();
			}
			expandParents(link);
			selectItem(link);
		} else {
			$(".object-tree-link").first().click();
			return;
		}
	}	
}

Template.TEMPLATE_NAME.rendered = function() {
	function resizeTree() {
		if(!$(".object-tree-container").length) {
			return;
		}
		var viewHeight = $(window).height();
		var footerHeight = $("#footer").outerHeight();
		var treeTop = $(".object-tree-container").offset().top;
		var treeHeight = $(".object-tree-container").height();
		var treeOuterHeight = $(".object-tree-container").outerHeight();
		var treeMarginTop = parseInt($(".object-tree-container").css("margin-top") || "0");
		var treeMarginBottom = parseInt($(".object-tree-container").css("margin-bottom") || "0");
		var availableHeight = viewHeight - footerHeight - treeTop - ((treeOuterHeight - treeHeight) + treeMarginTop + treeMarginBottom);
		if(availableHeight < 200) {
			availableHeight = 200;
		}

		$(".object-tree-container").height(availableHeight);
	}

	$(window).on('resize', function() {
		resizeTree();
	});

	resizeTree();
	selectRequestedOrFirstItem();
};

Template.TEMPLATE_NAME.events({

});

Template.TEMPLATE_NAME.helpers({
});


Template.jsonTreeView.rendered = function() {
	console.log("jsonTreeView rendered");
}

 //Deps.autorun(function() {
 //	if(Router.current() && Router.current().url) {
 //		selectRequestedOrFirstItem();
 //	}
 //});

Template.jsonTreeView.helpers({
	"objectMembers": function(rootId, object, meta) {
	
		var properties = [];
		for(var propertyName in object) {
			var property = object[propertyName];

			var isObject = false;
			var isArray = false;
			var id = "";
			var collapsable = false;
			var cssClass = "";

			if(_.isArray(property)) {
				id = object._id || "";
				var type = object.objectType || "";
				var arrayItemType = getObjectArrayItemType(type, propertyName, meta);
				isArray = arrayItemType != "string";
				collapsable = true;
				cssClass = "collapsable-item";
			} else {
				if(_.isObject(property)) {
					id = property._id || "";
					var type = property.objectType || "";
					isObject = type != "";
					// make everything collapsable
					collapsable = true;
					cssClass = "collapsable-item";
				}
			}
			
			
			if(isArray || isObject) {
				properties.push({
					rootId: rootId,
					objectId: id,
					name: propertyName,
					isObject: isObject,
					isArray: isArray,
					data: property,
					meta: meta,
					collapsable: collapsable,
					cssClass: cssClass
				});
			}
		}
		return properties;	
	},
	"objectArray": function(rootId, array, meta) {
		var objects = [];
		_.each(array, function(item, index) {
			if(_.isObject(item)) {
				var id = item._id || "";
				var name = item.name || item.title || item.source || item.objectType + " " + (index + 1);

				objects.push({ rootId: rootId, objectId: id, name: name, data: item, meta: meta, collapsable: true, cssClass: "object-item collapsable-item" });
			}
		});
		return objects;
	},

	"arrayItemCount": function(array) {
		return array ? array.length : 0;
	}
});

Template.jsonTreeView.events({
	"click .object-tree-link": function(e, t) {
		e.preventDefault();

		var link = $(e.currentTarget);
		var objectId = this.objectId || "";

		// well, this is not the most compact form but it works ;)
		var parents = $(link).parentsUntil("div", "li");
		var searchPath = [];
		_.each(parents, p => {
			var c = $(p).children("a").first();
			searchPath.push($(c).attr("data-property-name"));
		});

		if (objectId) {
			var propertyName = link.attr("data-property-name") || "";

			var redirect = false;
			if (Router.current() && Router.current().route) {
				var routeName = Router.current().route.getName();
				if (routeName != "applications.details.json_view") {
					return false;
				}
				var currentObjectId = Router.current().params.objectId || "";
				var currentPropertyName = Router.current().params.propertyName || "";

				if (currentObjectId == "null") currentObjectId = "";
				if (currentPropertyName == "null") currentPropertyName = "";

				if (objectId == currentObjectId && propertyName == currentPropertyName) {
					redirect = false;
				}
			}


			if (propertyName) {
				if (redirect) {
					console.log('Router.go("applications.details.json_view", { applicationId: this.rootId, objectId: objectId, propertyName: propertyName });');
				}
				else {
					selectItem(link);
					selectInCodeMirror(searchPath);
				}
			}
			else {
				if (redirect) {
					console.log('Router.go("applications.details.json_view", { applicationId: this.rootId, objectId: objectId, propertyName: null });');
				}
				else {
					selectItem(link);
					selectInCodeMirror(searchPath);
				}
			}
		}
		return false;
	}
});


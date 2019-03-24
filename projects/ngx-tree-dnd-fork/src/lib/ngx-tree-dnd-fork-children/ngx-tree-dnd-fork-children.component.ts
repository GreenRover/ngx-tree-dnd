import { ChangeDetectorRef, NgZone } from '@angular/core';
/*
 Copyright (C) 2018 Yaroslav Kikot
 This project is licensed under the terms of the MIT license.
 https://github.com/Zicrael/ngx-tree-dnd-fork
 */

import { Component, Input, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormGroup } from '@angular/forms';

import { NgxTreeService } from '../ngx-tree-dnd-fork.service';
import { TreeModel, TreeConfig, TreeItemOptions } from '../models/tree-view.model';
import { TreeItemType } from '../models/tree-view.enum';

import * as moment_ from 'moment';
import { Subscription } from 'rxjs';
import { faPlus, faEdit, faTimes, faArrowDown, faMinus, faCheck } from '@fortawesome/free-solid-svg-icons';

const moment = moment_;

@Component({
  selector: "lib-ngx-tree-children",
  templateUrl: "./ngx-tree-dnd-fork-children.component.html"
})
export class NgxTreeChildrenComponent implements AfterViewInit {
  faPlus = faPlus;
  faEdit = faEdit;
  faTimes = faTimes;
  faArrowDown = faArrowDown;
  faMinus = faMinus;
  faCheck = faCheck;

  private formValueItemTypeChangesSubscription: Subscription;
  private formValueStartDateChangesSubscription: Subscription;
  private formValueEndDateChangesSubscription: Subscription;
  private formValueDurationChangesSubscription: Subscription;

  showError: boolean;
  config: TreeConfig;
  element: TreeModel;
  dragable: boolean;
  itemOptions: TreeItemOptions;
  childrensArray: TreeModel[];
  itemEditForm: FormGroup;
  treeItemType = TreeItemType;

  private selectedType: TreeItemType = TreeItemType.Milestone;

  // get item from parent component
  @Input()
  set setItem(data: TreeModel) {
    this.element = data;
    this.itemOptions = {
      href: "#",
      hidden: false,
      hideChildrens: false,
      position: this.treeService.getItemPosition(this.element),
      draggable: true,
      edit: false,
      showActionButtons: true,
      currentlyDragging: false,
      destenationTop: false,
      destenationBottom: false,
      disabled: false,
      showExpandButton: true,
      showDeleteButton: true
    };
    if (this.element.options) {
      this.setOptions(this.element.options);
      this.element.options = this.itemOptions;
    } else {
      this.element.options = this.itemOptions;
    }

    // enable subscribers
    this.enableSubscribers();
    // create form
    this.createForm();
  }

  constructor(
    private treeService: NgxTreeService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef,
    private zone: NgZone
  ) {}
  
  // enable subscribe to config
  enableSubscribers() {
    this.treeService.config.subscribe(config => {
      if (config !== null) {
        this.config = config;
      } else {
        this.config = this.treeService.defaulConfig;
      }
      if (this.element.options.draggable) {
        this.element.options.draggable = this.config.enableDragging;
      }
    });
  }

  // set options to item
  setOptions(options) {
    for (const key of Object.keys(options)) {
      this.setValue(key, options);
    }
  }

  // set value to options keys
  setValue(item, options) {
    this.itemOptions[item] = options[item];
  }

  // create edit form
  createForm() {
    let itemType = this.element.contents
      ? this.element.contents.type
      : TreeItemType.TaskGroup;
    let startDate = this.element.contents
      ? moment(this.element.contents.startDate)
      : moment();
    let endDate = this.element.contents
      ? moment(this.element.contents.endDate)
      : moment().add(1, "months");
    let active = this.element.contents ? this.element.contents.active : false;

    this.itemEditForm = this.fb.group({
      name: [
        this.element.name || "",
        [
          Validators.required,
          Validators.minLength(this.config.minCharacterLength)
        ]
      ],
      duration: [endDate.diff(startDate, "days"), Validators.required],
      startDate: [startDate, Validators.required],
      endDate: [endDate, Validators.required],
      itemType: [itemType, Validators.required],
      itemActive: active
    });
    this.selectedType = itemType;
    this.onChanges();
  }

  onChanges(): void {
    this.formValueItemTypeChangesSubscription = this.itemEditForm
      .get("itemType")
      .valueChanges.subscribe(val => {
        // If changed to milestone, make end date equal to start date and duration to 0
        // Else, add 1 day to start date
        if (val == TreeItemType.Milestone) {
          this.itemEditForm.patchValue(
            {
              endDate: moment(this.itemEditForm.get("startDate").value),
              duration: 0
            },
            { emitEvent: false }
          );
        } else {
          if (this.selectedType == TreeItemType.Milestone){
            this.itemEditForm.patchValue(
              {
                endDate: moment(this.itemEditForm.get("startDate").value).add(
                  1,
                  "days"
                ),
                duration: 1
              },
              { emitEvent: false }
            );
          }
        }
        this.selectedType = val;
      });

    this.formValueStartDateChangesSubscription = this.itemEditForm
      .get("startDate")
      .valueChanges.subscribe(val => {
        // If type == milestone, change end date to equal start date
        // Else, update duration
        if (this.itemEditForm.get("itemType").value == TreeItemType.Milestone) {
          this.itemEditForm.patchValue(
            {
              endDate: moment(this.itemEditForm.get("startDate").value)
            },
            { emitEvent: false }
          );
        }
        else {
          this.itemEditForm.patchValue(
            {
              duration: moment(this.itemEditForm.get("endDate").value).diff(
                moment(this.itemEditForm.get("startDate").value),
                "days"
              )
            },
            { emitEvent: false }
          );
        }

        if (moment(val).isSame(moment(this.itemEditForm.get("endDate").value))) {
          this.itemEditForm.patchValue(
            {
              itemType: TreeItemType.Milestone
            },
            {
              emitEvent: false
            }
          )
        }
      });

    this.formValueEndDateChangesSubscription = this.itemEditForm
      .get("endDate")
      .valueChanges.subscribe(val => {
        // If type == milestone, change start date to equal end date
        // Else, update duration
        if (this.itemEditForm.get("itemType").value == TreeItemType.Milestone) {
          this.itemEditForm.patchValue(
            {
              itemType: TreeItemType.Task,
              duration: moment(this.itemEditForm.get("endDate").value).diff(
                moment(this.itemEditForm.get("startDate").value),
                "days"
              )
            },
            { emitEvent: false }
          );
        }
        else {
          this.itemEditForm.patchValue(
            {
              duration: moment(this.itemEditForm.get("endDate").value).diff(
                moment(this.itemEditForm.get("startDate").value),
                "days"
              )
            },
            { emitEvent: false }
          );
        }

        if (moment(val).isSame(moment(this.itemEditForm.get("startDate").value))) {
          this.itemEditForm.patchValue(
            {
              itemType: TreeItemType.Milestone
            },
            {
              emitEvent: false
            }
          )
        }
      });

    this.formValueDurationChangesSubscription = this.itemEditForm
      .get("duration")
      .valueChanges.subscribe(val => {
        // If milestone and duration > 0, change to task, add duration days to start date and update end date
        // Else, add duration days to start date and update end date
        if (this.itemEditForm.get("itemType").value == TreeItemType.Milestone) {
          this.itemEditForm.patchValue(
            {
              itemType: TreeItemType.Task,
              endDate: moment(this.itemEditForm.get("startDate").value).add(
                val,
                "days"
              )
            },
            { emitEvent: false }
          );
        } else {
          this.itemEditForm.patchValue(
            {
              endDate: moment(this.itemEditForm.get("startDate").value).add(
                val,
                "days"
              )
            },
            { emitEvent: false }
          );
        }
      });
  }

  /*
    Event: onStartRenameItem;
    Enable rename mode in element
    Call onStartRenameItem() from tree service.
  */
  enableRenameMode(element) {
    this.zone.run(() => {
      element.options.edit = true;
      this.treeService.startRenameItem(element);
    })
  }

  /*
    Event: onadditem;
    Generate id by new Date() by 'full year + day + time'.
    Call addNewItem() from tree service.
  */
  submitAdd(name, item) {
    this.zone.run(() => {
      const d = `${new Date().getFullYear()}${new Date().getDay()}${new Date().getTime()}`;
      const elemId = parseInt(d, null);
      this.treeService.addNewItem(elemId, name, item);
      this.element.options.hideChildrens = false;
      // this.cd.detectChanges();
    })
  }

  /*
    Event: onFinishRenameItem;
    Check is form valid.
    Call addNewItem() from tree service.
  */
  submitEdit(item) {
    this.zone.run(() => {
      if (this.itemEditForm.valid) {
        this.showError = false;
        this.treeService.finishEditItem(this.itemEditForm.value, item.id);
        this.element.options.edit = false;
      } else {
        this.showError = true;
      }
    })

  }

  /*
    Event: onremoveitem;
    Check is item edit, then if name empty delete item.
    Call deleteItem() from tree service.
  */
  onSubmitDelete(item) {
    this.zone.run(() => {
      if (!this.element.options.edit) {
        this.treeService.deleteItem(item.id);
      } else {
        if (item.name === null) {
          this.treeService.deleteItem(item.id);
        } else {
          this.element.options.edit = false;
          // this.cd.detectChanges();
        }
      }
    })
  }

  // after view init
  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.formValueItemTypeChangesSubscription) {
      this.formValueItemTypeChangesSubscription.unsubscribe();
      this.formValueItemTypeChangesSubscription = null;
    }

    if (this.formValueStartDateChangesSubscription) {
      this.formValueStartDateChangesSubscription.unsubscribe();
      this.formValueStartDateChangesSubscription = null;
    }

    if (this.formValueEndDateChangesSubscription) {
      this.formValueEndDateChangesSubscription.unsubscribe();
      this.formValueEndDateChangesSubscription = null;
    }

    if (this.formValueDurationChangesSubscription) {
      this.formValueDurationChangesSubscription.unsubscribe();
      this.formValueDurationChangesSubscription = null;
    }
    this.cd.detach();
  }
}

# Quantifying irrigation adaptation strategies in response to stakeholder-driven groundwater management in the US High Plains Aquifer

14 January 2019  
Code by: Jillian Deines  
Contact: jillian.deines@gmail.com  

This codebase accompanies the paper:

Deines, JM, AD Kendall, JJ Butler, Jr., & DW Hyndman. 2019. Quantifying irrigation adaptation strategies in response to stakeholder-driven groundwater management in the US High Plains Aquifer. Environmental Research Letters. DOI: https://doi.org/10.1088/1748-9326/aafe39

Contents:

* Processed, derived data used in paper analyses
* Code to perform all paper analyses and generate figures in the paper
* Code to produce the derived data from raw data sources. Raw data is publicly available and not provided here.

## Google Earth Engine (GEE) scripts
GEE was used to access previously published climate, crop type maps, and irrigation maps. Scripts used to summarize these assets for the study areas include the following and can be run in the [Google Earth Engine Code Editor](https://code.earthengine.google.com/). To learn more about GEE and/or sign up for a free account, go [here](https://developers.google.com/earth-engine/).

* 00.00_gee_defineStudyArea_Final.js
* 00.04_gee_CDL_Summaries_final.js
* 00.70_gee_Get_AIMRRB_andAncillary_Final.js

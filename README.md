# Deines et al. 2019, ERL, Derived data and analysis code

14 January 2019  
Code by: Jillian Deines  
Contact: jillian.deines@gmail.com  

This codebase accompanies the paper:

Deines, JM, AD Kendall, JJ Butler, Jr., & DW Hyndman. 2019. Quantifying irrigation adaptation strategies in response to stakeholder-driven groundwater management in the US High Plains Aquifer. Environmental Research Letters. DOI: https://doi.org/10.1088/1748-9326/aafe39

## Contents

### Data
All data needed to reproduce the analyses and figures from Deines et al. 2019 can be found in the `data` folder. Data is provided as derived, processed data aggregated to regional levels (Sheridan 6 LEMA and the Control Region). Raw data providing point location information on water levels or well pumping are not included in this repository to leave data access under the purview of the data sources (such as the Kansas Geological Survey), out of abundance of caution for data privacy; at the time of writing, all data sources are publicly available and sources are provided in the manuscript and data preparation scripts.

Note: the control region is also referred to as "Null 9" at various places, as it was the 9th candidate boundary and represents the null hypothesis.

**Data included here**

* `data/tabular/masterTidyData_Wide_20181018.csv`: regional summaries of data variables, including pumping volumes, annual water tables, crop areas, etc. Produced via code in code/data_preparation folder
* `data/tabular/causalImpact_summaries_05-20_20181018.csv`: formatted output from pumping/water table causalImpact analyses (code/00.10_analyses_PumpingAndWaterLevels.Rmd)
* `data/GIS/boundaries`: GIS polygon files for the study regions (Sheridan 6 boundary, our control, and the buffered study region)

Additional intermediate data files are included as well. See processing scripts for details.

### Scripts

* Code to produce the derived data from raw data sources (`code/data_preparation` folder). 
* Code to perform all paper analyses and generate figures in the paper (`code` folder)

Script filenames are numbered in sequential order of use. The majority of processing is done using [R Markdown](https://rmarkdown.rstudio.com/).

#### Google Earth Engine (GEE) scripts
GEE was used to access previously published climate, crop type maps, and irrigation maps. Scripts used to summarize these assets for the study areas include the following and can be run in the [Google Earth Engine Code Editor](https://code.earthengine.google.com/). To learn more about GEE and/or sign up for a free account, go [here](https://developers.google.com/earth-engine/).

* `00.00_gee_makeAncillaryData.js`: aggregates gridded climate data to specified time steps
* `00.02_gee_defineStudyArea_Final.js`: calculates attributes used to delineate the control region
* `00.04_gee_CDL_Summaries_final.js`: summarizes crop-specific areas using USDA Cropland Data Layers for the regions of interest
* `00.70_gee_Get_AIMRRB_andAncillary_Final.js`: summarizes irrigated areas as mapped in [Deines et al. 2017](https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1002/2017GL074071) using Landsat satellite data. Annual irrigation maps are also available for download at [Hydroshare](https://www.hydroshare.org/resource/55331a41d5f34c97baf90beb910af070/).

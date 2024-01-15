import json
import pandas as pd

# Function to determine distance level
def get_distance_level(row):
    prev_proposer = row["prevProposer"]
    proposer = row["proposer"]
    prev_proposer_loc = validator_locations.get(prev_proposer, "")
    proposer_loc = validator_locations.get(proposer, "")

    if prev_proposer_loc == proposer_loc:
        # return 1
        return f"1_{prev_proposer_loc}"  # Append the specific region to distance_level 1
 
    elif (prev_proposer_loc, proposer_loc) in [("kr", "jp"), ("jp", "kr")]:
        return 2
    elif (prev_proposer_loc, proposer_loc) in [("jp", "sg"), ("sg", "jp")]:
        return 3
    elif (prev_proposer_loc, proposer_loc) in [("kr", "sg"), ("sg", "kr")]:
        return 4
    else:
        return None


# Validator locations
validator_locations = {
    '1inch': 'sg',
    'abc': 'kr',
    'anotherworld': 'jp',
    'binance': 'kr',
    'creder-itcen': 'kr',
    'dorafactory': 'jp',
    'fsn': 'sg',
    'gx': 'jp',
    'hankyung': 'kr',
    'hanwha-systems': 'sg',
    'hashkey': 'sg',
    'ozys': 'kr',
    'jump-everstake': 'sg',
    'kakao': 'kr',
    'kakao-entertainment': 'kr',
    'metabora': 'kr',
    'kakao-pay': 'kr',
    'kf': 'jp',
    'kommunedao': 'jp',
    'kracker-labs': 'sg',
    'krosslab': 'sg',
    'marblex': 'kr',
    'maekyung': 'sg',
    'neopin': 'kr',
    'netmarble': 'kr',
    'nftbank': 'sg',
    'p2eall': 'jp',
    'playdapp': 'jp',
    'presto-labs': 'jp',
    'quantstamp': 'jp',
    'swapscanner': 'sg',
    'sygnum': 'jp',
    'verichains': 'sg',
    'wemix': 'kr'
}



# Read the JSON data from the uploaded file
#file_path = './sample1.csv'
file_path = './20231023.json'
with open(file_path, 'r') as f:
    lines = f.readlines()
    data = [json.loads(line.strip()) for line in lines]


# Create a DataFrame to hold the relevant information
# df = pd.DataFrame(data)

# Create an empty list to store late validator counts with their distance level
late_validator_counts = []
late_validator_counts_by_distance_level = {}




pd.set_option('display.max_rows', None)

# Create a DataFrame
# Convert the list of dictionaries to a DataFrame
df = pd.DataFrame(data)

# Apply the function to create a new column for distance level
df['distance_level'] = df.apply(get_distance_level, axis=1)

# Filter rows where lateTimes are greater than 300ms
df = df[df.apply(lambda row: any(x > 300  for x in row['assessment'].get('lateTimes', [])), axis=1)]

# Calculate the range of the number of 'lateTimes' for each row in the DataFrame
range_of_lateTimes = df['assessment'].apply(lambda x: len(x.get('lateTimes', [])))

# Find the minimum and maximum number of 'lateTimes' across all rows
min_lateTimes = range_of_lateTimes.min()
max_lateTimes = range_of_lateTimes.max()

# Filter the rows where the number of 'lateTimes' is less than 10 and extract their 'lateTimes'
rows_with_fewer_lateTimes = df[df['assessment'].apply(lambda x: len(x.get('lateTimes', [])) != 10)]['assessment'].apply(lambda x: x.get('lateTimes', []))

# Extract the 'validator' and 'blocknum' for the rows with fewer than 10 'lateTimes'
rows_with_fewer_lateTimes_info = df.loc[rows_with_fewer_lateTimes.index, ['blocknum', 'proposer']]
rows_with_fewer_lateTimes_info['num_lateTimes'] = rows_with_fewer_lateTimes.apply(len)


# Display the 'validator' and 'blocknum' for these rows
print(rows_with_fewer_lateTimes_info)

# Display the 'lateTimes' for these rows
print(rows_with_fewer_lateTimes)

print(min_lateTimes, max_lateTimes)
occurrences_of_lateTimes = range_of_lateTimes.value_counts().sort_index()
print(occurrences_of_lateTimes)




# Create an empty list to store records
records = []

# Iterate through the DataFrame
for _, row in df.iterrows():
    for validator, late_time in zip(row['assessment'].get('late', []), row['assessment'].get('lateTimes', [])):
        if late_time > 300:
            record = {
                'prevProposer': row['prevProposer'],
                'proposer': row['proposer'],
                'distance_level': row['distance_level'],
                'validator': validator,
                'late_time': late_time,
            }
            records.append(record)

  
# Create a new DataFrame from the records
df_late = pd.DataFrame(records)

# Add location information to validators
df_late['validator_location'] = df_late['validator'].map(validator_locations)



# Group by distance level, prevProposer, proposer, and validator, and then count occurrences
# grouped_df = df_late.groupby(['distance_level', 'prevProposer', 'proposer', 'validator', 'validator_location']).size().reset_index(name='counts')
grouped_df = df_late.groupby(['distance_level', 'validator', 'validator_location']).size().reset_index(name='counts')

# Sort by counts
#sorted_grouped_df = grouped_df.sort_values(by='counts', ascending=False)
sorted_by_validator_and_counts = grouped_df.sort_values(by=['validator', 'counts'], ascending=[True, False])

# Convert the 'distance_level' to string type to handle mixed types
sorted_by_validator_and_counts['distance_level'] = sorted_by_validator_and_counts['distance_level'].astype(str)

# Group the data by 'distance_level' and sum the 'counts' to find the tendency of late communication occurrences
grouped_by_distance_level = sorted_by_validator_and_counts.groupby('distance_level')['counts'].sum().reset_index()

# Sort the DataFrame by 'distance_level'
grouped_by_distance_level = grouped_by_distance_level.sort_values(by='distance_level')



# Remove string suffixes in 'distance_level' to convert them to pure numeric form for correlation analysis
grouped_by_distance_level['numeric_distance_level'] = grouped_by_distance_level['distance_level'].str.extract('(\d+)').astype(int)

print(grouped_by_distance_level)
# Calculate the correlation between 'numeric_distance_level' and 'counts'
correlation_result = grouped_by_distance_level['numeric_distance_level'].corr(grouped_by_distance_level['counts'])


# Filter out the data related to the validator 'nftbank'
filtered_without_nftbank = sorted_by_validator_and_counts[sorted_by_validator_and_counts['validator'] != 'nftbank']

# Regroup the data by 'distance_level' and sum the 'counts' after removing 'nftbank'
grouped_without_nftbank = filtered_without_nftbank.groupby('distance_level')['counts'].sum().reset_index()

# Add a numeric form of 'distance_level' for correlation analysis
grouped_without_nftbank['numeric_distance_level'] = grouped_without_nftbank['distance_level'].str.extract('(\d+)').astype(int)
print(grouped_without_nftbank)

# Calculate the new correlation between 'numeric_distance_level' and 'counts'
new_correlation_result = grouped_without_nftbank['numeric_distance_level'].corr(grouped_without_nftbank['counts'])


print(correlation_result, new_correlation_result)

